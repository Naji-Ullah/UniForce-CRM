"""Report generation: build a PDF, log it to `reports`, return bytes + filename.

Every generated document is recorded in the audit table (who/what/when/params)
so report history is itself queryable data, not a side effect.
"""
from datetime import date

from sqlalchemy.orm import Session

from app.core.errors import NotFoundError
from app.models.academic import Class
from app.models.assessment import Quiz, QuizMark
from app.models.organization import Organization
from app.models.report import Report
from app.repositories.repos import ClassRepository
from app.services.attendance_service import class_summary
from app.utils.pdf import build_pdf


def _org_name(db: Session, org_id: int) -> str:
    org = db.get(Organization, org_id)
    return org.name if org else "Organization"


def _class_label(db: Session, org_id: int, class_id: int) -> tuple[Class, str]:
    klass = ClassRepository(db, org_id).get(class_id)
    if not klass:
        raise NotFoundError("Class not found in this organization")
    label = f"{klass.course.code} {klass.course.title} — Section {klass.section} ({klass.term})"
    return klass, label


def _log(db: Session, org_id: int, user_id: int | None, rtype: str, scope: str,
         ref: int, file_name: str, params: dict) -> None:
    db.add(
        Report(
            organization_id=org_id,
            generated_by_user_id=user_id,
            report_type=rtype,
            scope=scope,
            reference_id=ref,
            file_name=file_name,
            params=params,
        )
    )
    db.commit()


def attendance_report(db: Session, org_id: int, user_id: int, class_id: int) -> tuple[bytes, str]:
    klass, label = _class_label(db, org_id, class_id)
    summary = class_summary(db, org_id, class_id)
    rows = [
        [s.student_name, s.total_sessions, s.present, s.absent, s.late, s.excused,
         f"{s.attendance_percentage}%"]
        for s in summary
    ]
    pdf = build_pdf(
        organization_name=_org_name(db, org_id),
        title="Attendance Report",
        meta={"Class": label, "Students": str(len(summary))},
        sections=[("Attendance Summary",
                   ["Student", "Sessions", "Present", "Absent", "Late", "Excused", "%"],
                   rows)],
    )
    fname = f"attendance_class_{class_id}_{date.today()}.pdf"
    _log(db, org_id, user_id, "attendance", "class", class_id, fname, {"class_id": class_id})
    return pdf, fname


def quiz_report(db: Session, org_id: int, user_id: int, class_id: int) -> tuple[bytes, str]:
    klass, label = _class_label(db, org_id, class_id)
    quizzes = db.query(Quiz).filter(
        Quiz.organization_id == org_id, Quiz.class_id == class_id
    ).all()
    sections = []
    for qz in quizzes:
        marks = db.query(QuizMark).filter(QuizMark.quiz_id == qz.id).all()
        rows = [
            [m.student.full_name, f"{float(m.marks_obtained)}/{float(qz.total_marks)}",
             m.remarks or "—"]
            for m in marks
        ]
        sections.append((f"{qz.title} ({qz.quiz_date or 'n/a'})",
                         ["Student", "Marks", "Remarks"], rows))
    if not sections:
        sections = [("Quizzes", ["Student", "Marks", "Remarks"], [])]
    pdf = build_pdf(
        organization_name=_org_name(db, org_id),
        title="Quiz Marks Report",
        meta={"Class": label, "Quizzes": str(len(quizzes))},
        sections=sections,
    )
    fname = f"quiz_class_{class_id}_{date.today()}.pdf"
    _log(db, org_id, user_id, "quiz", "class", class_id, fname, {"class_id": class_id})
    return pdf, fname


def class_summary_report(db: Session, org_id: int, user_id: int, class_id: int) -> tuple[bytes, str]:
    klass, label = _class_label(db, org_id, class_id)
    att = class_summary(db, org_id, class_id)
    roster = [[e.student.enrollment_number, e.student.full_name, e.status,
               e.final_grade or "—"] for e in klass.enrollments]
    att_rows = [[s.student_name, f"{s.attendance_percentage}%"] for s in att]
    pdf = build_pdf(
        organization_name=_org_name(db, org_id),
        title="Class Summary Report",
        meta={"Class": label, "Teacher": klass.teacher.user.full_name,
              "Enrolled": str(len(klass.enrollments))},
        sections=[
            ("Roster", ["Enrollment #", "Student", "Status", "Final Grade"], roster),
            ("Attendance Overview", ["Student", "Attendance %"], att_rows),
        ],
    )
    fname = f"class_summary_{class_id}_{date.today()}.pdf"
    _log(db, org_id, user_id, "class_summary", "class", class_id, fname, {"class_id": class_id})
    return pdf, fname
