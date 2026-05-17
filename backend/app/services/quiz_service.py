"""Quizzes and bulk quiz-mark entry."""
from sqlalchemy.orm import Session

from app.core.errors import NotFoundError
from app.models.assessment import Quiz, QuizMark
from app.repositories.repos import ClassRepository, QuizRepository
from app.schemas.assessment import QuizCreate, QuizMarkBulkCreate


def create_quiz(db: Session, org_id: int, data: QuizCreate) -> Quiz:
    if not ClassRepository(db, org_id).get(data.class_id):
        raise NotFoundError("Class not found in this organization")
    q = Quiz(organization_id=org_id, **data.model_dump())
    db.add(q)
    db.commit()
    db.refresh(q)
    return q


def list_quizzes(db: Session, org_id: int, limit: int, offset: int) -> list[Quiz]:
    return QuizRepository(db, org_id).list(limit=limit, offset=offset)


def record_marks(db: Session, org_id: int, data: QuizMarkBulkCreate) -> int:
    if not QuizRepository(db, org_id).get(data.quiz_id):
        raise NotFoundError("Quiz not found in this organization")
    existing = {
        m.student_id: m
        for m in db.query(QuizMark).filter(
            QuizMark.organization_id == org_id, QuizMark.quiz_id == data.quiz_id
        )
    }
    try:
        for entry in data.entries:
            if entry.student_id in existing:
                m = existing[entry.student_id]
                m.marks_obtained = entry.marks_obtained
                m.remarks = entry.remarks
            else:
                db.add(
                    QuizMark(
                        organization_id=org_id,
                        quiz_id=data.quiz_id,
                        student_id=entry.student_id,
                        marks_obtained=entry.marks_obtained,
                        remarks=entry.remarks,
                    )
                )
        db.commit()
    except Exception:
        db.rollback()
        raise
    return len(data.entries)


def list_marks(db: Session, org_id: int, quiz_id: int) -> list[dict]:
    marks = (
        db.query(QuizMark)
        .filter(QuizMark.organization_id == org_id, QuizMark.quiz_id == quiz_id)
        .all()
    )
    out = []
    for m in marks:
        row = {c.name: getattr(m, c.name) for c in m.__table__.columns}
        row["student_name"] = m.student.full_name if m.student else None
        out.append(row)
    return out
