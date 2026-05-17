"""Aggregate counts for the tenant dashboard (single grouped-count round trip
per entity — cheap, indexed on organization_id)."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import TenantContext, get_tenant
from app.models.academic import Class, Course, Enrollment
from app.models.assessment import Assignment, Quiz
from app.models.identity import Student, Teacher

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


class DashboardStats(BaseModel):
    organization_id: int
    teachers: int
    students: int
    courses: int
    classes: int
    enrollments: int
    assignments: int
    quizzes: int


@router.get("", response_model=DashboardStats)
def stats(ctx: TenantContext = Depends(get_tenant), db: Session = Depends(get_db)):
    oid = ctx.organization_id

    def c(model):
        return db.execute(
            select(func.count()).select_from(model).where(model.organization_id == oid)
        ).scalar_one()

    return DashboardStats(
        organization_id=oid,
        teachers=c(Teacher),
        students=c(Student),
        courses=c(Course),
        classes=c(Class),
        enrollments=c(Enrollment),
        assignments=c(Assignment),
        quizzes=c(Quiz),
    )
