"""Class-level ownership guards.

A TEACHER may only operate on classes where `Class.teacher_id` matches their
own profile. Managers and the platform Head Admin bypass these checks.

Keeping the rule here (not duplicated across every router) means there is
exactly one place to update if the ownership policy changes.
"""
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import TenantContext
from app.models.academic import Class
from app.models.assessment import (
    Assignment,
    AssignmentSubmission,
    Quiz,
)
from app.models.enums import RoleName
from app.models.identity import Teacher, User


def teacher_id_for(db: Session, user: User) -> int | None:
    """Return the Teacher profile id for a TEACHER user, else None.

    Returning None for non-teachers is intentional — callers use it as the
    'no filter' signal for list endpoints.
    """
    if user.role.name != RoleName.TEACHER.value:
        return None
    t = (
        db.query(Teacher)
        .filter(Teacher.user_id == user.id, Teacher.organization_id == user.organization_id)
        .first()
    )
    return t.id if t else None


def _forbid(detail: str) -> HTTPException:
    return HTTPException(status.HTTP_403_FORBIDDEN, detail)


def require_class_access(db: Session, ctx: TenantContext, class_id: int) -> None:
    """Raise 403 if a TEACHER tries to touch a class they don't teach."""
    if ctx.user.role.name != RoleName.TEACHER.value:
        return
    t_id = teacher_id_for(db, ctx.user)
    if t_id is None:
        raise _forbid("No teacher profile linked to this account")
    klass = (
        db.query(Class)
        .filter(Class.id == class_id, Class.organization_id == ctx.organization_id)
        .first()
    )
    if klass is None:
        # Not found, but masquerade as 403 to avoid leaking existence across tenants.
        raise _forbid("Class not found or not yours")
    if klass.teacher_id != t_id:
        raise _forbid("Teachers can only act on classes they teach")


def require_quiz_access(db: Session, ctx: TenantContext, quiz_id: int) -> None:
    if ctx.user.role.name != RoleName.TEACHER.value:
        return
    q = (
        db.query(Quiz)
        .filter(Quiz.id == quiz_id, Quiz.organization_id == ctx.organization_id)
        .first()
    )
    if q is None:
        raise _forbid("Quiz not found or not yours")
    require_class_access(db, ctx, q.class_id)


def require_assignment_access(db: Session, ctx: TenantContext, assignment_id: int) -> None:
    if ctx.user.role.name != RoleName.TEACHER.value:
        return
    a = (
        db.query(Assignment)
        .filter(
            Assignment.id == assignment_id,
            Assignment.organization_id == ctx.organization_id,
        )
        .first()
    )
    if a is None:
        raise _forbid("Assignment not found or not yours")
    require_class_access(db, ctx, a.class_id)


def require_submission_access(db: Session, ctx: TenantContext, submission_id: int) -> None:
    if ctx.user.role.name != RoleName.TEACHER.value:
        return
    sub = (
        db.query(AssignmentSubmission)
        .filter(
            AssignmentSubmission.id == submission_id,
            AssignmentSubmission.organization_id == ctx.organization_id,
        )
        .first()
    )
    if sub is None:
        raise _forbid("Submission not found or not yours")
    require_assignment_access(db, ctx, sub.assignment_id)
