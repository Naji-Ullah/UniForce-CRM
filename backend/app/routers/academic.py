"""Courses, classes and enrollments under one router file (same domain)."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.access import require_class_access, teacher_id_for
from app.core.database import get_db
from app.core.deps import TenantContext, get_tenant, require_roles
from app.models.enums import RoleName
from app.routers._serialize import class_out, enrollment_out
from app.schemas.academic import (
    ClassCreate,
    ClassOut,
    ClassUpdate,
    CourseCreate,
    CourseOut,
    CourseUpdate,
    EnrollmentCreate,
    EnrollmentOut,
    EnrollmentUpdate,
)
from app.services import academic_service as svc

Ctx = Depends(get_tenant)
# Reads: any staff role may view the academic structure.
staff = Depends(require_roles(RoleName.TEACHER, RoleName.MANAGER, RoleName.HEAD_ADMIN))
# Writes: only Managers (and the platform Head Admin) may mutate the
# catalogue. Teachers don't create courses, classes, or enrollments.
admin = Depends(require_roles(RoleName.MANAGER, RoleName.HEAD_ADMIN))

courses = APIRouter(prefix="/courses", tags=["courses"])
classes = APIRouter(prefix="/classes", tags=["classes"])
enrollments = APIRouter(prefix="/enrollments", tags=["enrollments"])


# --- Courses --------------------------------------------------------------
@courses.post("", response_model=CourseOut, status_code=201, dependencies=[admin])
def create_course(body: CourseCreate, ctx: TenantContext = Ctx, db: Session = Depends(get_db)):
    return svc.create_course(db, ctx.organization_id, body)


@courses.get("", response_model=list[CourseOut])
def list_courses(
    ctx: TenantContext = Ctx, db: Session = Depends(get_db),
    limit: int = Query(50, le=200), offset: int = 0,
):
    return svc.list_courses(db, ctx.organization_id, limit, offset)


@courses.patch("/{course_id}", response_model=CourseOut, dependencies=[admin])
def update_course(
    course_id: int, body: CourseUpdate, ctx: TenantContext = Ctx, db: Session = Depends(get_db)
):
    return svc.update_course(db, ctx.organization_id, course_id, body)


@courses.delete("/{course_id}", status_code=204, dependencies=[admin])
def delete_course(course_id: int, ctx: TenantContext = Ctx, db: Session = Depends(get_db)):
    svc.delete_course(db, ctx.organization_id, course_id)


# --- Classes --------------------------------------------------------------
@classes.post("", response_model=ClassOut, status_code=201, dependencies=[admin])
def create_class(body: ClassCreate, ctx: TenantContext = Ctx, db: Session = Depends(get_db)):
    return class_out(svc.create_class(db, ctx.organization_id, body))


@classes.get("", response_model=list[ClassOut])
def list_classes(
    ctx: TenantContext = Ctx, db: Session = Depends(get_db),
    limit: int = Query(50, le=200), offset: int = 0,
):
    return [
        class_out(k)
        for k in svc.list_classes(
            db, ctx.organization_id, limit, offset,
            teacher_id=teacher_id_for(db, ctx.user),
        )
    ]


@classes.get("/{class_id}", response_model=ClassOut)
def get_class(class_id: int, ctx: TenantContext = Ctx, db: Session = Depends(get_db)):
    require_class_access(db, ctx, class_id)
    return class_out(svc.get_class(db, ctx.organization_id, class_id))


@classes.patch("/{class_id}", response_model=ClassOut, dependencies=[admin])
def update_class(
    class_id: int, body: ClassUpdate, ctx: TenantContext = Ctx, db: Session = Depends(get_db)
):
    return class_out(svc.update_class(db, ctx.organization_id, class_id, body))


@classes.delete("/{class_id}", status_code=204, dependencies=[admin])
def delete_class(class_id: int, ctx: TenantContext = Ctx, db: Session = Depends(get_db)):
    svc.delete_class(db, ctx.organization_id, class_id)


# --- Enrollments ----------------------------------------------------------
@enrollments.post("", response_model=EnrollmentOut, status_code=201, dependencies=[admin])
def enroll(body: EnrollmentCreate, ctx: TenantContext = Ctx, db: Session = Depends(get_db)):
    return enrollment_out(svc.enroll(db, ctx.organization_id, body))


@enrollments.get("", response_model=list[EnrollmentOut])
def list_enrollments(
    class_id: int, ctx: TenantContext = Ctx, db: Session = Depends(get_db)
):
    require_class_access(db, ctx, class_id)
    return [enrollment_out(e) for e in svc.list_enrollments(db, ctx.organization_id, class_id)]


@enrollments.patch("/{enrollment_id}", response_model=EnrollmentOut, dependencies=[admin])
def update_enrollment(
    enrollment_id: int,
    body: EnrollmentUpdate,
    ctx: TenantContext = Ctx,
    db: Session = Depends(get_db),
):
    return enrollment_out(svc.update_enrollment(db, ctx.organization_id, enrollment_id, body))


@enrollments.delete("/{enrollment_id}", status_code=204, dependencies=[admin])
def unenroll(enrollment_id: int, ctx: TenantContext = Ctx, db: Session = Depends(get_db)):
    svc.unenroll(db, ctx.organization_id, enrollment_id)
