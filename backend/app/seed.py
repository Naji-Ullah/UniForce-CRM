"""Bootstrap + demo seed.

`ensure_bootstrap` is idempotent and safe to run on every startup: it creates
the four role rows and the platform Head Admin if missing.

`seed_demo` populates demo organizations so multi-tenant behaviour is visible
immediately. Run it explicitly:  `python -m app.seed`
"""
from datetime import date, datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.academic import Class, Course, Department, Enrollment
from app.models.assessment import (
    Assignment,
    AssignmentMark,
    AssignmentSubmission,
    Attendance,
    Quiz,
    QuizMark,
)
from app.models.enums import AttendanceStatus, RoleName, SubmissionStatus
from app.models.identity import Manager, Role, Student, Teacher, User
from app.models.organization import Organization

_ROLE_SEED = {
    RoleName.HEAD_ADMIN: "Platform owner. Manages organizations and global setup.",
    RoleName.MANAGER: "Organization administrator. Manages teachers and org data.",
    RoleName.TEACHER: "Manages students, attendance, assignments and quizzes.",
    RoleName.STUDENT: "Learner with a self-service login (view attendance and marks).",
}


def ensure_bootstrap(db: Session) -> None:
    for name, desc in _ROLE_SEED.items():
        if not db.query(Role).filter(Role.name == name.value).first():
            db.add(Role(name=name.value, description=desc))
    db.commit()

    head = db.query(User).filter(User.email == settings.HEAD_ADMIN_EMAIL.lower()).first()
    if not head:
        role = db.query(Role).filter(Role.name == RoleName.HEAD_ADMIN.value).one()
        db.add(
            User(
                organization_id=None,
                role_id=role.id,
                email=settings.HEAD_ADMIN_EMAIL.lower(),
                full_name=settings.HEAD_ADMIN_NAME,
                hashed_password=hash_password(settings.HEAD_ADMIN_PASSWORD),
            )
        )
        db.commit()


def _role_id(db: Session, name: RoleName) -> int:
    return db.query(Role).filter(Role.name == name.value).one().id


# -- small demo orgs (Northfield / Riverside) ------------------------------
def _make_demo_org(db: Session, *, name: str, slug: str, mgr_email: str) -> Organization:
    if db.query(Organization).filter(Organization.slug == slug).first():
        return db.query(Organization).filter(Organization.slug == slug).first()

    org = Organization(name=name, slug=slug, domain=f"{slug}.edu")
    db.add(org)
    db.flush()

    manager_user = User(
        organization_id=org.id,
        role_id=_role_id(db, RoleName.MANAGER),
        email=mgr_email,
        full_name=f"{name} Manager",
        hashed_password=hash_password("Manager@123"),
    )
    db.add(manager_user)
    db.flush()
    db.add(Manager(user_id=manager_user.id, organization_id=org.id, title="Registrar"))

    dept = Department(
        organization_id=org.id, code="CS",
        name="Computer Science",
        description="Computing and information systems.",
    )
    db.add(dept)
    db.flush()

    t_user = User(
        organization_id=org.id,
        role_id=_role_id(db, RoleName.TEACHER),
        email=f"teacher@{slug}.edu",
        full_name=f"{name} Teacher",
        hashed_password=hash_password("Teacher@123"),
    )
    db.add(t_user)
    db.flush()
    teacher = Teacher(
        user_id=t_user.id, organization_id=org.id, employee_code="T-001",
        department_id=dept.id, hire_date=date(2022, 8, 1),
    )
    db.add(teacher)
    db.flush()

    course = Course(
        organization_id=org.id, code="CS-101",
        title="Introduction to Programming", credit_hours=3,
    )
    db.add(course)
    db.flush()
    klass = Class(
        organization_id=org.id, course_id=course.id, teacher_id=teacher.id,
        section="A", term="Fall 2026", room="Lab-1", schedule="Mon/Wed 10:00",
    )
    db.add(klass)
    db.flush()

    for i in range(1, 6):
        s = Student(
            organization_id=org.id,
            enrollment_number=f"{slug.upper()}-2026-{i:03d}",
            full_name=f"{name} Student {i}",
            email=f"student{i}@{slug}.edu",
            admission_date=date(2026, 8, 15),
        )
        db.add(s)
        db.flush()
        db.add(Enrollment(organization_id=org.id, student_id=s.id, class_id=klass.id))
        for d in range(5):
            db.add(
                Attendance(
                    organization_id=org.id, class_id=klass.id, student_id=s.id,
                    session_date=date(2026, 9, 1) + timedelta(days=d),
                    status=(AttendanceStatus.PRESENT.value if (i + d) % 4 else AttendanceStatus.ABSENT.value),
                    marked_by_teacher_id=teacher.id,
                )
            )

    assignment = Assignment(
        organization_id=org.id, class_id=klass.id,
        title="Assignment 1: Variables", max_marks=100,
        created_by_teacher_id=teacher.id,
    )
    db.add(assignment)
    quiz = Quiz(
        organization_id=org.id, class_id=klass.id, title="Quiz 1",
        topic="Basics", total_marks=20, quiz_date=date(2026, 9, 20),
        created_by_teacher_id=teacher.id,
    )
    db.add(quiz)
    db.flush()
    for s in db.query(Student).filter(Student.organization_id == org.id).all():
        db.add(
            QuizMark(
                organization_id=org.id, quiz_id=quiz.id, student_id=s.id,
                marks_obtained=12 + (s.id % 8),
            )
        )
    db.commit()
    return org


# -- CUI Lahore (the big, realistic Pakistani-name seed) -------------------
_DEFAULT_STUDENT_PW = "Password1234!"

_FIRST_NAMES_M = [
    "Muhammad", "Ahmed", "Ali", "Hassan", "Hussain", "Bilal", "Usman", "Hamza",
    "Zain", "Talha", "Saad", "Faisal", "Asad", "Awais", "Umar", "Junaid",
    "Imran", "Raheel", "Adnan", "Shahid", "Kashif", "Tariq", "Rizwan", "Salman",
    "Waqas", "Daniyal", "Haris", "Abdullah", "Ibrahim", "Yasir",
]
_FIRST_NAMES_F = [
    "Fatima", "Ayesha", "Hira", "Sana", "Maryam", "Zainab", "Aisha", "Rabia",
    "Mehwish", "Noor", "Iqra", "Anum", "Sadia", "Aliya", "Nimra", "Hina",
    "Saima", "Mahnoor", "Komal", "Sumaira", "Sidra", "Nida", "Areeba", "Eman",
    "Bushra", "Kainat", "Laiba", "Mariam", "Sehrish", "Tooba",
]
_LAST_NAMES = [
    "Khan", "Ahmed", "Malik", "Raza", "Sheikh", "Butt", "Chaudhry", "Iqbal",
    "Rashid", "Mehmood", "Hussain", "Akhtar", "Saleem", "Aslam", "Ashraf",
    "Javed", "Farooq", "Anwar", "Hassan", "Siddiqui", "Qureshi", "Bhatti",
    "Awan", "Gill", "Tariq", "Riaz", "Yousaf", "Niazi", "Cheema", "Mughal",
]


def _name(i: int, female: bool = False) -> str:
    """Deterministic, *non-colliding* name picker for the seed.

    The previous version used `(i*3) % 30` for the last name, which gave a
    period of 30 and made student #i collide with student #(i+30). Pairing
    the first-name index from a different "row" via integer-divide breaks
    the collision: (first_idx, last_idx) becomes a 2-D coordinate so any
    `i` in 0..899 yields a unique pair.
    """
    first = _FIRST_NAMES_F if female else _FIRST_NAMES_M
    nf, nl = len(first), len(_LAST_NAMES)
    first_idx = i % nf
    last_idx = ((i // nf) * 17 + i) % nl
    return f"{first[first_idx]} {_LAST_NAMES[last_idx]}"


_DEPARTMENTS = [
    ("CS", "Computer Science", "Programming, algorithms and software systems."),
    ("EE", "Electrical Engineering", "Circuits, power, communications and control."),
    ("MGT", "Management Sciences", "Business administration and finance."),
    ("MAT", "Mathematics", "Pure and applied mathematics."),
    ("PHY", "Physics", "Theoretical and experimental physics."),
]

# (department_code, course_code, title, credit_hours)
_COURSES = [
    ("CS", "CSC-101", "Programming Fundamentals", 3),
    ("CS", "CSC-241", "Data Structures", 3),
    ("CS", "CSC-371", "Database Systems", 3),
    ("CS", "CSC-462", "Software Engineering", 3),
    ("EE", "EEE-121", "Circuit Analysis I", 3),
    ("EE", "EEE-231", "Digital Logic Design", 3),
    ("MGT", "MGT-101", "Principles of Management", 3),
    ("MGT", "MGT-301", "Marketing Management", 3),
    ("MAT", "MTH-104", "Calculus & Analytic Geometry", 3),
    ("PHY", "PHY-105", "Applied Physics", 3),
]

# Teachers: (employee_code, female?, dept_code)
_TEACHERS = [
    ("FAC-CS-01", False, "CS"),
    ("FAC-CS-02", True,  "CS"),
    ("FAC-CS-03", False, "CS"),
    ("FAC-EE-01", False, "EE"),
    ("FAC-EE-02", True,  "EE"),
    ("FAC-MGT-01", True, "MGT"),
    ("FAC-MGT-02", False, "MGT"),
    ("FAC-MAT-01", False, "MAT"),
    ("FAC-PHY-01", True, "PHY"),
    ("FAC-PHY-02", False, "PHY"),
]


def _seed_cui_lahore(db: Session) -> Organization:
    slug = "cuilahore"
    existing = db.query(Organization).filter(Organization.slug == slug).first()
    if existing:
        return existing

    org = Organization(
        name="COMSATS University Islamabad — Lahore Campus",
        slug=slug,
        domain="cuilahore.edu.pk",
    )
    db.add(org)
    db.flush()

    # Manager (Pakistani name).
    mgr_user = User(
        organization_id=org.id,
        role_id=_role_id(db, RoleName.MANAGER),
        email="manager@cuilahore.edu.pk",
        full_name="Dr. Imran Mehmood",
        hashed_password=hash_password(_DEFAULT_STUDENT_PW),
    )
    db.add(mgr_user)
    db.flush()
    db.add(Manager(user_id=mgr_user.id, organization_id=org.id,
                   title="Campus Registrar", phone="+92-300-1234567"))

    # Departments.
    depts: dict[str, Department] = {}
    for code, name, desc in _DEPARTMENTS:
        d = Department(organization_id=org.id, code=code, name=name, description=desc)
        db.add(d)
        db.flush()
        depts[code] = d

    # Teachers.
    teachers: list[Teacher] = []
    for idx, (emp_code, female, dept_code) in enumerate(_TEACHERS):
        full_name = _name(idx + 7, female=female)  # offset to vary names
        slug_email = full_name.lower().replace(" ", ".").replace(".", "")
        # Make a stable, readable email.
        email = f"{full_name.split()[0].lower()}.{full_name.split()[-1].lower()}.{emp_code.lower()}@cuilahore.edu.pk"
        u = User(
            organization_id=org.id,
            role_id=_role_id(db, RoleName.TEACHER),
            email=email,
            full_name=full_name,
            hashed_password=hash_password(_DEFAULT_STUDENT_PW),
        )
        db.add(u)
        db.flush()
        t = Teacher(
            user_id=u.id, organization_id=org.id,
            employee_code=emp_code, department_id=depts[dept_code].id,
            phone=f"+92-3{(idx*7+1) % 10}{(idx*13+3) % 10}-{1000000 + idx * 91337:07d}"[:16],
            hire_date=date(2018 + (idx % 6), ((idx % 12) or 1), 15),
        )
        db.add(t)
        db.flush()
        teachers.append(t)

    # Courses.
    courses: dict[str, Course] = {}
    for dept_code, code, title, credits in _COURSES:
        c = Course(organization_id=org.id, code=code, title=title, credit_hours=credits)
        db.add(c)
        db.flush()
        courses[code] = c

    # Classes — one section per course, term Spring 2026, assigning teachers
    # from the matching department where possible.
    classes: list[Class] = []
    rooms = ["A-101", "A-203", "B-110", "B-212", "C-15", "C-22", "Lab-3", "Lab-5"]
    schedules = ["Mon/Wed 09:00", "Tue/Thu 10:30", "Mon/Wed 11:30",
                 "Tue/Thu 14:00", "Fri 09:00 + Mon 13:00"]
    for i, (dept_code, code, title, _) in enumerate(_COURSES):
        # Pick a teacher in the matching dept.
        cand = [t for t in teachers if t.department_id == depts[dept_code].id]
        teacher = cand[i % len(cand)] if cand else teachers[i % len(teachers)]
        k = Class(
            organization_id=org.id, course_id=courses[code].id, teacher_id=teacher.id,
            section="A", term="Spring 2026",
            room=rooms[i % len(rooms)], schedule=schedules[i % len(schedules)],
            capacity=60,
        )
        db.add(k)
        db.flush()
        classes.append(k)

    # Students — 60 students with logins.
    students: list[Student] = []
    for i in range(60):
        female = (i % 3 == 0)
        full_name = _name(i, female=female)
        enrollment = f"FA26-BCS-{i + 1:03d}"
        email = f"fa26bcs{i + 1:03d}@cuilahore.edu.pk"

        u = User(
            organization_id=org.id,
            role_id=_role_id(db, RoleName.STUDENT),
            email=email,
            full_name=full_name,
            hashed_password=hash_password(_DEFAULT_STUDENT_PW),
        )
        db.add(u)
        db.flush()
        s = Student(
            organization_id=org.id, user_id=u.id,
            enrollment_number=enrollment, full_name=full_name, email=email,
            phone=f"+92-3{(i % 10)}{((i * 7) % 10)}-{1000000 + i * 12345:07d}"[:16],
            gender=("Female" if female else "Male"),
            date_of_birth=date(2004 + (i % 3), ((i % 12) or 1), ((i % 27) or 1)),
            address=f"House #{i + 1}, Block {chr(65 + (i % 8))}, Johar Town, Lahore",
            admission_date=date(2026, 8, 15),
        )
        db.add(s)
        db.flush()
        students.append(s)

    # Enrollments — every student enrolls in 4 classes (a typical term load).
    # Use a deterministic round-robin so coverage is even.
    for si, s in enumerate(students):
        offsets = [(si + k) % len(classes) for k in range(4)]
        for o in offsets:
            db.add(Enrollment(organization_id=org.id, student_id=s.id,
                              class_id=classes[o].id))
    db.flush()

    # Attendance — 4 weeks (Mon/Wed), realistic distribution per student.
    # Make a few "needs improvement" students (below 80%) and most strong.
    session_dates = []
    start = date(2026, 2, 3)  # Tuesday
    for week in range(4):
        session_dates.append(start + timedelta(days=week * 7))
        session_dates.append(start + timedelta(days=week * 7 + 2))

    for k in classes:
        roster = (
            db.query(Student)
            .join(Enrollment, Enrollment.student_id == Student.id)
            .filter(Enrollment.class_id == k.id)
            .all()
        )
        for s in roster:
            # Use student id mod to bias attendance: ~10% of students <80%.
            poor = (s.id % 9) == 0
            for di, d in enumerate(session_dates):
                if poor:
                    # Pattern with ~50% absent.
                    status = (
                        AttendanceStatus.PRESENT.value if (di + s.id) % 2
                        else AttendanceStatus.ABSENT.value
                    )
                else:
                    # Strong: present most days, occasional late, rare absent.
                    bucket = (di * 11 + s.id) % 10
                    if bucket == 0:
                        status = AttendanceStatus.ABSENT.value
                    elif bucket == 1:
                        status = AttendanceStatus.LATE.value
                    else:
                        status = AttendanceStatus.PRESENT.value
                db.add(
                    Attendance(
                        organization_id=org.id, class_id=k.id, student_id=s.id,
                        session_date=d, status=status,
                        marked_by_teacher_id=k.teacher_id,
                    )
                )
    db.flush()

    # Assignments + submissions + marks. Two assignments per class.
    for k in classes:
        roster = (
            db.query(Student)
            .join(Enrollment, Enrollment.student_id == Student.id)
            .filter(Enrollment.class_id == k.id)
            .all()
        )
        for ai in (1, 2):
            a = Assignment(
                organization_id=org.id, class_id=k.id,
                title=f"Assignment {ai}",
                description=f"Topic exercise {ai} for {k.course.code}.",
                max_marks=100,
                created_by_teacher_id=k.teacher_id,
                due_date=datetime(2026, 3, ai * 10, 23, 59, tzinfo=timezone.utc),
            )
            db.add(a)
            db.flush()
            for s in roster:
                sub = AssignmentSubmission(
                    organization_id=org.id, assignment_id=a.id, student_id=s.id,
                    content=f"Submitted by {s.full_name}",
                    status=SubmissionStatus.GRADED.value,
                    submitted_at=datetime(2026, 3, ai * 10 - 1, 12, 0, tzinfo=timezone.utc),
                )
                db.add(sub)
                db.flush()
                # Marks: 55-95 range, biased a bit by student id.
                marks = 55 + ((s.id * 7 + ai * 13) % 41)
                db.add(
                    AssignmentMark(
                        organization_id=org.id, submission_id=sub.id,
                        graded_by_teacher_id=k.teacher_id,
                        marks_obtained=float(marks),
                        feedback="Good effort." if marks >= 80 else "Needs more practice.",
                        graded_at=datetime(2026, 3, ai * 10 + 2, 9, 0, tzinfo=timezone.utc),
                    )
                )

    # Quizzes — three quizzes per class with bulk marks.
    for k in classes:
        roster = (
            db.query(Student)
            .join(Enrollment, Enrollment.student_id == Student.id)
            .filter(Enrollment.class_id == k.id)
            .all()
        )
        for qi in (1, 2, 3):
            q = Quiz(
                organization_id=org.id, class_id=k.id,
                title=f"Quiz {qi}", topic=f"Module {qi}",
                total_marks=20,
                quiz_date=date(2026, 2 + (qi - 1), 14),
                created_by_teacher_id=k.teacher_id,
            )
            db.add(q)
            db.flush()
            for s in roster:
                m = 10 + ((s.id * 3 + qi * 5) % 11)  # 10–20
                db.add(QuizMark(
                    organization_id=org.id, quiz_id=q.id, student_id=s.id,
                    marks_obtained=float(m),
                ))

    db.commit()
    return org


def seed_demo(db: Session) -> None:
    ensure_bootstrap(db)
    _make_demo_org(db, name="Northfield University", slug="northfield",
                   mgr_email="manager@northfield.edu")
    _make_demo_org(db, name="Riverside Institute of Technology", slug="riverside",
                   mgr_email="manager@riverside.edu")
    _seed_cui_lahore(db)


if __name__ == "__main__":
    s = SessionLocal()
    try:
        seed_demo(s)
        print("Seed complete. Head Admin:", settings.HEAD_ADMIN_EMAIL)
        print("Demo managers: manager@northfield.edu / manager@riverside.edu (pw: Manager@123)")
        print("Demo teachers: teacher@northfield.edu / teacher@riverside.edu (pw: Teacher@123)")
        print("CUI Lahore manager: manager@cuilahore.edu.pk (pw: Password1234!)")
        print("CUI Lahore students: fa26bcs001@cuilahore.edu.pk … fa26bcs060@cuilahore.edu.pk (pw: Password1234!)")
    finally:
        s.close()
