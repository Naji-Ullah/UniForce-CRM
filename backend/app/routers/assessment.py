"""Attendance, assignments and quizzes."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import TenantContext, get_tenant, require_roles
from app.models.enums import RoleName
from app.schemas.assessment import (
    AssignmentCreate,
    AssignmentOut,
    AttendanceBulkCreate,
    AttendanceSummary,
    MarkCreate,
    QuizCreate,
    QuizMarkBulkCreate,
    QuizMarkOut,
    QuizOut,
    SubmissionCreate,
    SubmissionOut,
)
from app.schemas.common import Message
from app.services import assignment_service as a_svc
from app.services import attendance_service as att_svc
from app.services import quiz_service as q_svc

Ctx = Depends(get_tenant)
staff = Depends(require_roles(RoleName.TEACHER, RoleName.MANAGER, RoleName.HEAD_ADMIN))

attendance = APIRouter(prefix="/attendance", tags=["attendance"])
assignments = APIRouter(prefix="/assignments", tags=["assignments"])
quizzes = APIRouter(prefix="/quizzes", tags=["quizzes"])


# --- Attendance -----------------------------------------------------------
@attendance.post("/mark", response_model=Message, dependencies=[staff])
def mark(body: AttendanceBulkCreate, ctx: TenantContext = Ctx, db: Session = Depends(get_db)):
    n = att_svc.mark_session(db, ctx.organization_id, body)
    return Message(detail=f"Recorded attendance for {n} students")


@attendance.get("/summary", response_model=list[AttendanceSummary])
def summary(class_id: int, ctx: TenantContext = Ctx, db: Session = Depends(get_db)):
    return att_svc.class_summary(db, ctx.organization_id, class_id)


# --- Assignments ----------------------------------------------------------
@assignments.post("", response_model=AssignmentOut, status_code=201, dependencies=[staff])
def create_assignment(
    body: AssignmentCreate, ctx: TenantContext = Ctx, db: Session = Depends(get_db)
):
    return a_svc.create_assignment(db, ctx.organization_id, body)


@assignments.get("", response_model=list[AssignmentOut])
def list_assignments(
    ctx: TenantContext = Ctx, db: Session = Depends(get_db),
    limit: int = Query(50, le=200), offset: int = 0,
):
    return a_svc.list_assignments(db, ctx.organization_id, limit, offset)


@assignments.post("/submissions", response_model=SubmissionOut, status_code=201, dependencies=[staff])
def submit(body: SubmissionCreate, ctx: TenantContext = Ctx, db: Session = Depends(get_db)):
    return a_svc.submit(db, ctx.organization_id, body)


@assignments.get("/{assignment_id}/submissions", response_model=list[SubmissionOut])
def list_submissions(
    assignment_id: int, ctx: TenantContext = Ctx, db: Session = Depends(get_db)
):
    return a_svc.list_submissions(db, ctx.organization_id, assignment_id)


@assignments.post("/marks", response_model=Message, dependencies=[staff])
def grade(body: MarkCreate, ctx: TenantContext = Ctx, db: Session = Depends(get_db)):
    a_svc.grade(db, ctx.organization_id, body, teacher_id=None)
    return Message(detail="Submission graded")


# --- Quizzes --------------------------------------------------------------
@quizzes.post("", response_model=QuizOut, status_code=201, dependencies=[staff])
def create_quiz(body: QuizCreate, ctx: TenantContext = Ctx, db: Session = Depends(get_db)):
    return q_svc.create_quiz(db, ctx.organization_id, body)


@quizzes.get("", response_model=list[QuizOut])
def list_quizzes(
    ctx: TenantContext = Ctx, db: Session = Depends(get_db),
    limit: int = Query(50, le=200), offset: int = 0,
):
    return q_svc.list_quizzes(db, ctx.organization_id, limit, offset)


@quizzes.post("/marks", response_model=Message, dependencies=[staff])
def record_marks(
    body: QuizMarkBulkCreate, ctx: TenantContext = Ctx, db: Session = Depends(get_db)
):
    n = q_svc.record_marks(db, ctx.organization_id, body)
    return Message(detail=f"Recorded marks for {n} students")


@quizzes.get("/{quiz_id}/marks", response_model=list[QuizMarkOut])
def list_marks(quiz_id: int, ctx: TenantContext = Ctx, db: Session = Depends(get_db)):
    return q_svc.list_marks(db, ctx.organization_id, quiz_id)
