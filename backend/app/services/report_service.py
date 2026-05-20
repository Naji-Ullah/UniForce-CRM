"""Report generation: build a PDF, log it to `reports`, return bytes + filename.

Every generated document is recorded in the audit table (who/what/when/params)
so report history is itself queryable data, not a side effect.

Filters
-------
Reports accept an optional teacher-supplied threshold so a manager can produce
focused PDFs (e.g. "below 80% on quizzes" → at-risk students). The filter is
applied AFTER aggregation and is reflected in the PDF metadata so the document
self-describes the cohort.
"""
from datetime import date

from sqlalchemy.orm import Session

from app.core.errors import NotFoundError
from app.models.academic import Class
from app.models.assessment import (
    Assignment,
    AssignmentMark,
    AssignmentSubmission,
    Quiz,
    QuizMark,
)
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


def _filter_label(comparator: str | None, threshold: float | None) -> str | None:
    """Human-readable description of the active filter (or None for 'all')."""
    if not comparator or comparator == "all" or threshold is None:
        return None
    op = "≥" if comparator == "above" else "<"
    return f"{op} {threshold:g}%"


def _passes(value: float, comparator: str | None, threshold: float | None) -> bool:
    if not comparator or comparator == "all" or threshold is None:
        return True
    return value >= threshold if comparator == "above" else value < threshold


def attendance_report(
    db: Session, org_id: int, user_id: int, class_id: int,
    *, threshold: float | None = None, comparator: str | None = None,
) -> tuple[bytes, str]:
    klass, label = _class_label(db, org_id, class_id)
    summary = class_summary(db, org_id, class_id)
    filtered = [s for s in summary if _passes(s.attendance_percentage, comparator, threshold)]
    rows = [
        [s.student_name, s.total_sessions, s.present, s.absent, s.late, s.excused,
         f"{s.attendance_percentage}%"]
        for s in filtered
    ]
    flt = _filter_label(comparator, threshold)
    meta = {"Class": label, "Students": f"{len(filtered)} of {len(summary)}"}
    if flt:
        meta["Filter"] = f"Attendance {flt}"
    title = "Attendance Report" + (f" — {flt}" if flt else "")
    pdf = build_pdf(
        organization_name=_org_name(db, org_id),
        title=title,
        meta=meta,
        sections=[("Attendance Summary",
                   ["Student", "Sessions", "Present", "Absent", "Late", "Excused", "%"],
                   rows)],
    )
    fname = f"attendance_class_{class_id}_{date.today()}.pdf"
    _log(db, org_id, user_id, "attendance", "class", class_id, fname,
         {"class_id": class_id, "threshold": threshold, "comparator": comparator})
    return pdf, fname


def quiz_report(
    db: Session, org_id: int, user_id: int, class_id: int,
    *, threshold: float | None = None, comparator: str | None = None,
    quiz_id: int | None = None,
) -> tuple[bytes, str]:
    klass, label = _class_label(db, org_id, class_id)
    q = db.query(Quiz).filter(
        Quiz.organization_id == org_id, Quiz.class_id == class_id
    )
    if quiz_id is not None:
        q = q.filter(Quiz.id == quiz_id)
    quizzes = q.order_by(Quiz.quiz_date.nullslast(), Quiz.id).all()
    if quiz_id is not None and not quizzes:
        raise NotFoundError("Quiz not found in this class")
    sections = []
    kept = 0
    total = 0
    for qz in quizzes:
        marks = db.query(QuizMark).filter(QuizMark.quiz_id == qz.id).all()
        rows = []
        for m in marks:
            total += 1
            pct = float(m.marks_obtained) / float(qz.total_marks) * 100 if qz.total_marks else 0.0
            if not _passes(pct, comparator, threshold):
                continue
            kept += 1
            rows.append([
                m.student.full_name,
                f"{float(m.marks_obtained)}/{float(qz.total_marks)}",
                f"{round(pct, 1)}%",
                m.remarks or "—",
            ])
        sections.append((f"{qz.title} ({qz.quiz_date or 'n/a'})",
                         ["Student", "Marks", "%", "Remarks"], rows))
    if not sections:
        sections = [("Quizzes", ["Student", "Marks", "%", "Remarks"], [])]
    flt = _filter_label(comparator, threshold)
    meta = {"Class": label, "Quizzes": str(len(quizzes)),
            "Entries": f"{kept} of {total}"}
    if quiz_id is not None and quizzes:
        meta["Quiz"] = quizzes[0].title
    if flt:
        meta["Filter"] = f"Marks {flt}"
    title = ("Quiz Marks Report" if quiz_id is None else f"Quiz: {quizzes[0].title}") + (
        f" — {flt}" if flt else ""
    )
    pdf = build_pdf(
        organization_name=_org_name(db, org_id),
        title=title,
        meta=meta,
        sections=sections,
    )
    ref = quiz_id if quiz_id is not None else class_id
    scope = "quiz" if quiz_id is not None else "class"
    name_tag = f"quiz_{quiz_id}" if quiz_id is not None else f"quiz_class_{class_id}"
    fname = f"{name_tag}_{date.today()}.pdf"
    _log(db, org_id, user_id, "quiz", scope, ref, fname,
         {"class_id": class_id, "quiz_id": quiz_id,
          "threshold": threshold, "comparator": comparator})
    return pdf, fname


def assignment_report(
    db: Session, org_id: int, user_id: int, class_id: int,
    *, threshold: float | None = None, comparator: str | None = None,
    assignment_id: int | None = None,
) -> tuple[bytes, str]:
    klass, label = _class_label(db, org_id, class_id)
    aq = db.query(Assignment).filter(
        Assignment.organization_id == org_id, Assignment.class_id == class_id
    )
    if assignment_id is not None:
        aq = aq.filter(Assignment.id == assignment_id)
    assignments = aq.order_by(Assignment.due_date.nullslast(), Assignment.id).all()
    if assignment_id is not None and not assignments:
        raise NotFoundError("Assignment not found in this class")

    sections: list[tuple[str, list[str], list[list]]] = []
    kept = 0
    total = 0
    for a in assignments:
        subs = (
            db.query(AssignmentSubmission)
            .filter(
                AssignmentSubmission.organization_id == org_id,
                AssignmentSubmission.assignment_id == a.id,
            )
            .all()
        )
        rows = []
        for sub in subs:
            total += 1
            mark = sub.mark
            marks_str = (
                f"{float(mark.marks_obtained)}/{float(a.max_marks)}" if mark else "—"
            )
            pct = (
                float(mark.marks_obtained) / float(a.max_marks) * 100
                if mark and a.max_marks else None
            )
            # Filter applies to graded submissions only.
            if pct is None:
                if comparator and comparator != "all":
                    continue
            elif not _passes(pct, comparator, threshold):
                continue
            kept += 1
            rows.append([
                sub.student.full_name,
                sub.status,
                marks_str,
                f"{round(pct, 1)}%" if pct is not None else "—",
                (mark.feedback if mark else "") or "—",
            ])
        due = a.due_date.strftime("%Y-%m-%d") if a.due_date else "no due date"
        sections.append((f"{a.title} (due {due})",
                         ["Student", "Status", "Marks", "%", "Feedback"], rows))

    if not sections:
        sections = [("Assignments", ["Student", "Status", "Marks", "%", "Feedback"], [])]
    flt = _filter_label(comparator, threshold)
    meta = {"Class": label, "Assignments": str(len(assignments)),
            "Entries": f"{kept} of {total}"}
    if assignment_id is not None and assignments:
        meta["Assignment"] = assignments[0].title
    if flt:
        meta["Filter"] = f"Marks {flt}"
    title = ("Assignment Marks Report" if assignment_id is None
             else f"Assignment: {assignments[0].title}") + (f" — {flt}" if flt else "")
    pdf = build_pdf(
        organization_name=_org_name(db, org_id),
        title=title,
        meta=meta,
        sections=sections,
    )
    ref = assignment_id if assignment_id is not None else class_id
    scope = "assignment" if assignment_id is not None else "class"
    name_tag = (
        f"assignment_{assignment_id}" if assignment_id is not None
        else f"assignment_class_{class_id}"
    )
    fname = f"{name_tag}_{date.today()}.pdf"
    _log(db, org_id, user_id, "assignment", scope, ref, fname,
         {"class_id": class_id, "assignment_id": assignment_id,
          "threshold": threshold, "comparator": comparator})
    return pdf, fname


def class_summary_report(
    db: Session, org_id: int, user_id: int, class_id: int,
    *, threshold: float | None = None, comparator: str | None = None,
) -> tuple[bytes, str]:
    klass, label = _class_label(db, org_id, class_id)
    att = class_summary(db, org_id, class_id)
    att_filtered = [s for s in att if _passes(s.attendance_percentage, comparator, threshold)]
    keep_ids = {s.student_id for s in att_filtered}
    roster = [
        [e.student.enrollment_number, e.student.full_name, e.status, e.final_grade or "—"]
        for e in klass.enrollments
        if (not keep_ids) or e.student.id in keep_ids
    ]
    att_rows = [[s.student_name, f"{s.attendance_percentage}%"] for s in att_filtered]
    flt = _filter_label(comparator, threshold)
    meta = {"Class": label, "Teacher": klass.teacher.user.full_name,
            "Enrolled": str(len(klass.enrollments)),
            "Shown": f"{len(att_filtered)} of {len(att)}"}
    if flt:
        meta["Filter"] = f"Attendance {flt}"
    title = "Class Summary Report" + (f" — {flt}" if flt else "")
    pdf = build_pdf(
        organization_name=_org_name(db, org_id),
        title=title,
        meta=meta,
        sections=[
            ("Roster", ["Enrollment #", "Student", "Status", "Final Grade"], roster),
            ("Attendance Overview", ["Student", "Attendance %"], att_rows),
        ],
    )
    fname = f"class_summary_{class_id}_{date.today()}.pdf"
    _log(db, org_id, user_id, "class_summary", "class", class_id, fname,
         {"class_id": class_id, "threshold": threshold, "comparator": comparator})
    return pdf, fname
