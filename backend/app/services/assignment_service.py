"""Assignments, submissions and the one-to-one grade record."""
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.errors import ConflictError, NotFoundError
from app.models.assessment import Assignment, AssignmentMark, AssignmentSubmission
from app.models.enums import SubmissionStatus
from app.repositories.repos import (
    AssignmentRepository,
    ClassRepository,
    StudentRepository,
    SubmissionRepository,
)
from app.schemas.assessment import AssignmentCreate, MarkCreate, SubmissionCreate


def create_assignment(db: Session, org_id: int, data: AssignmentCreate) -> Assignment:
    if not ClassRepository(db, org_id).get(data.class_id):
        raise NotFoundError("Class not found in this organization")
    a = Assignment(organization_id=org_id, **data.model_dump())
    db.add(a)
    db.commit()
    db.refresh(a)
    return a


def list_assignments(db: Session, org_id: int, limit: int, offset: int) -> list[Assignment]:
    return AssignmentRepository(db, org_id).list(limit=limit, offset=offset)


def submit(db: Session, org_id: int, data: SubmissionCreate) -> AssignmentSubmission:
    if not AssignmentRepository(db, org_id).get(data.assignment_id):
        raise NotFoundError("Assignment not found in this organization")
    if not StudentRepository(db, org_id).get(data.student_id):
        raise NotFoundError("Student not found in this organization")
    if (
        db.query(AssignmentSubmission)
        .filter(
            AssignmentSubmission.assignment_id == data.assignment_id,
            AssignmentSubmission.student_id == data.student_id,
        )
        .first()
    ):
        raise ConflictError("Student already submitted this assignment")
    sub = AssignmentSubmission(
        organization_id=org_id,
        submitted_at=datetime.now(timezone.utc),
        status=SubmissionStatus.SUBMITTED.value,
        **data.model_dump(),
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub


def grade(db: Session, org_id: int, data: MarkCreate, teacher_id: int | None) -> AssignmentMark:
    sub = SubmissionRepository(db, org_id).get(data.submission_id)
    if not sub:
        raise NotFoundError("Submission not found in this organization")
    if sub.mark is not None:
        raise ConflictError("Submission is already graded")
    mark = AssignmentMark(
        organization_id=org_id,
        submission_id=sub.id,
        graded_by_teacher_id=teacher_id,
        marks_obtained=data.marks_obtained,
        feedback=data.feedback,
        graded_at=datetime.now(timezone.utc),
    )
    sub.status = SubmissionStatus.GRADED.value
    db.add(mark)
    db.commit()
    db.refresh(mark)
    return mark


def list_submissions(db: Session, org_id: int, assignment_id: int) -> list[dict]:
    subs = (
        db.query(AssignmentSubmission)
        .filter(
            AssignmentSubmission.organization_id == org_id,
            AssignmentSubmission.assignment_id == assignment_id,
        )
        .all()
    )
    result = []
    for s in subs:
        row = {c.name: getattr(s, c.name) for c in s.__table__.columns}
        row["student_name"] = s.student.full_name if s.student else None
        row["marks_obtained"] = float(s.mark.marks_obtained) if s.mark else None
        row["feedback"] = s.mark.feedback if s.mark else None
        result.append(row)
    return result
