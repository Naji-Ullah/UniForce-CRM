"""Student self-service: a logged-in STUDENT user reading *their own* data.

The student's record is resolved from the User row via the 1:1
`students.user_id` FK. Every query is also constrained by the user's
organization (defence in depth in case a user_id were ever spoofed).
"""
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.core.errors import ConflictError, NotFoundError
from app.models.academic import Class, Course, Enrollment
from app.models.assessment import (
    Assignment,
    AssignmentMark,
    AssignmentSubmission,
    Attendance,
    Quiz,
    QuizMark,
)
from app.models.enums import AttendanceStatus, EnrollmentStatus
from app.models.identity import Student, Teacher, User

# Academic policy: a student may not carry more than 21 credit hours across
# their currently-enrolled classes (dropped/completed courses don't count).
MAX_CREDIT_HOURS = 21


def _student_for(db: Session, user: User) -> Student:
    s = (
        db.query(Student)
        .filter(Student.user_id == user.id, Student.organization_id == user.organization_id)
        .first()
    )
    if not s:
        raise NotFoundError("No student profile linked to this account")
    return s


def profile(db: Session, user: User) -> dict:
    s = _student_for(db, user)
    return {
        "id": s.id,
        "user_id": s.user_id,
        "organization_id": s.organization_id,
        "enrollment_number": s.enrollment_number,
        "full_name": s.full_name,
        "email": s.email,
        "phone": s.phone,
        "gender": s.gender,
        "date_of_birth": s.date_of_birth,
        "address": s.address,
        "admission_date": s.admission_date,
        "status": s.status,
    }


def classes(db: Session, user: User) -> list[dict]:
    s = _student_for(db, user)
    rows = (
        db.query(Enrollment, Class, Course, Teacher, User)
        .join(Class, Class.id == Enrollment.class_id)
        .join(Course, Course.id == Class.course_id)
        .join(Teacher, Teacher.id == Class.teacher_id)
        .join(User, User.id == Teacher.user_id)
        .filter(Enrollment.student_id == s.id)
        .order_by(Class.term, Course.code)
        .all()
    )
    return [
        {
            "class_id": k.id,
            "course_code": c.code,
            "course_title": c.title,
            "section": k.section,
            "term": k.term,
            "room": k.room,
            "schedule": k.schedule,
            "teacher_name": tu.full_name,
            "status": e.status,
            "final_grade": e.final_grade,
        }
        for e, k, c, t, tu in rows
    ]


def attendance(db: Session, user: User) -> dict:
    """Returns per-class attendance breakdown + an overall summary."""
    s = _student_for(db, user)

    def cnt(status: AttendanceStatus):
        return func.sum(case((Attendance.status == status.value, 1), else_=0))

    rows = (
        db.query(
            Attendance.class_id,
            Course.code,
            Course.title,
            Class.section,
            Class.term,
            func.count(Attendance.id).label("total"),
            cnt(AttendanceStatus.PRESENT).label("present"),
            cnt(AttendanceStatus.ABSENT).label("absent"),
            cnt(AttendanceStatus.LATE).label("late"),
            cnt(AttendanceStatus.EXCUSED).label("excused"),
        )
        .join(Class, Class.id == Attendance.class_id)
        .join(Course, Course.id == Class.course_id)
        .filter(
            Attendance.student_id == s.id,
            Attendance.organization_id == s.organization_id,
        )
        .group_by(
            Attendance.class_id, Course.code, Course.title, Class.section, Class.term,
        )
        .order_by(Course.code)
        .all()
    )

    per_class = []
    grand_total = grand_attended = 0
    for r in rows:
        attended = (r.present or 0) + (r.late or 0)
        pct = round((attended / r.total) * 100, 2) if r.total else 0.0
        grand_total += r.total or 0
        grand_attended += attended
        per_class.append(
            {
                "class_id": r.class_id,
                "course_code": r.code,
                "course_title": r.title,
                "section": r.section,
                "term": r.term,
                "total_sessions": r.total or 0,
                "present": r.present or 0,
                "absent": r.absent or 0,
                "late": r.late or 0,
                "excused": r.excused or 0,
                "attendance_percentage": pct,
            }
        )

    overall = round((grand_attended / grand_total) * 100, 2) if grand_total else 0.0
    return {"per_class": per_class, "overall_percentage": overall,
            "total_sessions": grand_total, "attended": grand_attended}


def marks(db: Session, user: User) -> dict:
    """Quiz + assignment marks for this student across all classes."""
    s = _student_for(db, user)

    quiz_rows = (
        db.query(QuizMark, Quiz, Course, Class)
        .join(Quiz, Quiz.id == QuizMark.quiz_id)
        .join(Class, Class.id == Quiz.class_id)
        .join(Course, Course.id == Class.course_id)
        .filter(QuizMark.student_id == s.id, QuizMark.organization_id == s.organization_id)
        .order_by(Quiz.quiz_date.desc().nullslast(), Quiz.id.desc())
        .all()
    )

    assign_rows = (
        db.query(AssignmentSubmission, AssignmentMark, Assignment, Course, Class)
        .join(Assignment, Assignment.id == AssignmentSubmission.assignment_id)
        .join(Class, Class.id == Assignment.class_id)
        .join(Course, Course.id == Class.course_id)
        .outerjoin(AssignmentMark, AssignmentMark.submission_id == AssignmentSubmission.id)
        .filter(
            AssignmentSubmission.student_id == s.id,
            AssignmentSubmission.organization_id == s.organization_id,
        )
        .order_by(Assignment.due_date.desc().nullslast(), Assignment.id.desc())
        .all()
    )

    return {
        "quizzes": [
            {
                "quiz_id": q.id,
                "title": q.title,
                "topic": q.topic,
                "quiz_date": q.quiz_date,
                "course_code": c.code,
                "section": k.section,
                "term": k.term,
                "marks_obtained": float(qm.marks_obtained),
                "total_marks": float(q.total_marks),
                "percentage": round(float(qm.marks_obtained) / float(q.total_marks) * 100, 2)
                if q.total_marks else 0.0,
                "remarks": qm.remarks,
            }
            for qm, q, c, k in quiz_rows
        ],
        "assignments": [
            {
                "assignment_id": a.id,
                "title": a.title,
                "due_date": a.due_date,
                "course_code": c.code,
                "section": k.section,
                "term": k.term,
                "submission_status": sub.status,
                "submitted_at": sub.submitted_at,
                "marks_obtained": float(am.marks_obtained) if am else None,
                "total_marks": float(a.max_marks),
                "percentage": round(float(am.marks_obtained) / float(a.max_marks) * 100, 2)
                if am and a.max_marks else None,
                "feedback": am.feedback if am else None,
            }
            for sub, am, a, c, k in assign_rows
        ],
    }


# --- Self-registration ----------------------------------------------------
def _enrolled_credit_hours(db: Session, student_id: int) -> int:
    """Sum credit hours across the student's currently-enrolled classes."""
    total = (
        db.query(func.coalesce(func.sum(Course.credit_hours), 0))
        .select_from(Enrollment)
        .join(Class, Class.id == Enrollment.class_id)
        .join(Course, Course.id == Class.course_id)
        .filter(
            Enrollment.student_id == student_id,
            Enrollment.status == EnrollmentStatus.ENROLLED.value,
        )
        .scalar()
    )
    return int(total or 0)


def available_classes(db: Session, user: User) -> list[dict]:
    """Classes in the student's org they are not yet enrolled in."""
    s = _student_for(db, user)
    enrolled_ids = {
        cid for (cid,) in db.query(Enrollment.class_id)
        .filter(Enrollment.student_id == s.id)
        .all()
    }
    rows = (
        db.query(Class, Course, Teacher, User)
        .join(Course, Course.id == Class.course_id)
        .join(Teacher, Teacher.id == Class.teacher_id)
        .join(User, User.id == Teacher.user_id)
        .filter(Class.organization_id == s.organization_id)
        .order_by(Class.term, Course.code)
        .all()
    )
    result = []
    for k, c, t, tu in rows:
        if k.id in enrolled_ids:
            continue
        result.append({
            "class_id": k.id,
            "course_code": c.code,
            "course_title": c.title,
            "credit_hours": c.credit_hours,
            "section": k.section,
            "term": k.term,
            "room": k.room,
            "schedule": k.schedule,
            "teacher_name": tu.full_name,
            "capacity": k.capacity,
            "enrolled_count": len(k.enrollments),
        })
    return result


def registration_summary(db: Session, user: User) -> dict:
    """Current credit load + remaining headroom (for UI gating)."""
    s = _student_for(db, user)
    used = _enrolled_credit_hours(db, s.id)
    return {
        "credit_hours_used": used,
        "credit_hours_max": MAX_CREDIT_HOURS,
        "credit_hours_remaining": max(MAX_CREDIT_HOURS - used, 0),
    }


def register_for_class(db: Session, user: User, class_id: int) -> Enrollment:
    s = _student_for(db, user)
    klass = (
        db.query(Class)
        .filter(Class.id == class_id, Class.organization_id == s.organization_id)
        .first()
    )
    if not klass:
        raise NotFoundError("Class not found in your organization")

    already = (
        db.query(Enrollment)
        .filter(Enrollment.student_id == s.id, Enrollment.class_id == class_id)
        .first()
    )
    if already:
        raise ConflictError("You are already enrolled in this class")

    course = db.get(Course, klass.course_id)
    used = _enrolled_credit_hours(db, s.id)
    if used + course.credit_hours > MAX_CREDIT_HOURS:
        raise ConflictError(
            f"Credit-hour cap exceeded: this class adds {course.credit_hours} "
            f"to your current {used}, but the limit is {MAX_CREDIT_HOURS}."
        )

    enrolled_count = (
        db.query(func.count(Enrollment.id))
        .filter(Enrollment.class_id == class_id)
        .scalar()
    )
    if enrolled_count >= klass.capacity:
        raise ConflictError("This class is full")

    e = Enrollment(
        organization_id=s.organization_id,
        student_id=s.id,
        class_id=class_id,
        status=EnrollmentStatus.ENROLLED.value,
    )
    db.add(e)
    db.commit()
    db.refresh(e)
    return e


def drop_class(db: Session, user: User, class_id: int) -> None:
    s = _student_for(db, user)
    e = (
        db.query(Enrollment)
        .filter(Enrollment.student_id == s.id, Enrollment.class_id == class_id)
        .first()
    )
    if not e:
        raise NotFoundError("You are not enrolled in this class")
    db.delete(e)
    db.commit()
