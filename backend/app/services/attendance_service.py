"""Attendance: bulk session marking + aggregated percentage reporting.

`mark_session` upserts a whole class's attendance for one date inside a single
transaction. The summary is computed with a grouped aggregate query (SQL does
the counting, not Python) — the project's main "query optimization" example.
"""
from datetime import date

from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.core.errors import NotFoundError
from app.models.assessment import Attendance
from app.models.enums import AttendanceStatus
from app.models.identity import Student
from app.repositories.repos import ClassRepository
from app.schemas.assessment import AttendanceBulkCreate, AttendanceSummary


def mark_session(db: Session, org_id: int, data: AttendanceBulkCreate) -> int:
    if not ClassRepository(db, org_id).get(data.class_id):
        raise NotFoundError("Class not found in this organization")

    existing = {
        a.student_id: a
        for a in db.query(Attendance).filter(
            Attendance.organization_id == org_id,
            Attendance.class_id == data.class_id,
            Attendance.session_date == data.session_date,
        )
    }
    try:
        for entry in data.entries:
            if entry.student_id in existing:  # idempotent re-mark
                row = existing[entry.student_id]
                row.status = entry.status
                row.remarks = entry.remarks
            else:
                db.add(
                    Attendance(
                        organization_id=org_id,
                        class_id=data.class_id,
                        student_id=entry.student_id,
                        session_date=data.session_date,
                        status=entry.status,
                        remarks=entry.remarks,
                    )
                )
        db.commit()
    except Exception:
        db.rollback()
        raise
    return len(data.entries)


def class_summary(db: Session, org_id: int, class_id: int) -> list[AttendanceSummary]:
    if not ClassRepository(db, org_id).get(class_id):
        raise NotFoundError("Class not found in this organization")

    S = AttendanceStatus

    def cnt(status: AttendanceStatus):
        return func.sum(case((Attendance.status == status.value, 1), else_=0))

    rows = (
        db.query(
            Attendance.student_id,
            Student.full_name,
            func.count(Attendance.id).label("total"),
            cnt(S.PRESENT).label("present"),
            cnt(S.ABSENT).label("absent"),
            cnt(S.LATE).label("late"),
            cnt(S.EXCUSED).label("excused"),
        )
        .join(Student, Student.id == Attendance.student_id)
        .filter(
            Attendance.organization_id == org_id,
            Attendance.class_id == class_id,
        )
        .group_by(Attendance.student_id, Student.full_name)
        .order_by(Student.full_name)
        .all()
    )

    out: list[AttendanceSummary] = []
    for r in rows:
        total = r.total or 0
        # PRESENT + LATE count toward attendance; ABSENT/EXCUSED do not.
        attended = (r.present or 0) + (r.late or 0)
        pct = round((attended / total) * 100, 2) if total else 0.0
        out.append(
            AttendanceSummary(
                student_id=r.student_id,
                student_name=r.full_name,
                total_sessions=total,
                present=r.present or 0,
                absent=r.absent or 0,
                late=r.late or 0,
                excused=r.excused or 0,
                attendance_percentage=pct,
            )
        )
    return out
