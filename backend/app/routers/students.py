from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import TenantContext, get_current_user, get_tenant, require_roles
from app.models.enums import RoleName
from app.models.identity import User
from app.schemas.identity import StudentCreate, StudentOut, StudentUpdate
from app.services import people_service as svc
from app.services import student_self_service as me_svc

router = APIRouter(prefix="/students", tags=["students"])
Ctx = Depends(get_tenant)
# Reads: any staff role can browse the roster.
staff = Depends(require_roles(RoleName.TEACHER, RoleName.MANAGER, RoleName.HEAD_ADMIN))
# Writes: only Manager + Head Admin can add/edit/remove student records.
# Teachers attend, grade and mark — but they don't admit students.
admin = Depends(require_roles(RoleName.MANAGER, RoleName.HEAD_ADMIN))
student_only = Depends(require_roles(RoleName.STUDENT))


# --- Student self-service (must come BEFORE /{student_id} to avoid path collision) ---
@router.get("/me", dependencies=[student_only])
def my_profile(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return me_svc.profile(db, user)


@router.get("/me/classes", dependencies=[student_only])
def my_classes(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return me_svc.classes(db, user)


@router.get("/me/attendance", dependencies=[student_only])
def my_attendance(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return me_svc.attendance(db, user)


@router.get("/me/marks", dependencies=[student_only])
def my_marks(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return me_svc.marks(db, user)


# --- Staff-facing student CRUD --------------------------------------------
@router.post("", response_model=StudentOut, status_code=201, dependencies=[admin])
def create(body: StudentCreate, ctx: TenantContext = Ctx, db: Session = Depends(get_db)):
    return svc.create_student(db, ctx.organization_id, body)


@router.get("", response_model=list[StudentOut], dependencies=[staff])
def list_(
    ctx: TenantContext = Ctx,
    db: Session = Depends(get_db),
    limit: int = Query(50, le=200),
    offset: int = 0,
):
    return svc.list_students(db, ctx.organization_id, limit, offset)


@router.get("/{student_id}", response_model=StudentOut, dependencies=[staff])
def get(student_id: int, ctx: TenantContext = Ctx, db: Session = Depends(get_db)):
    return svc.get_student(db, ctx.organization_id, student_id)


@router.patch("/{student_id}", response_model=StudentOut, dependencies=[admin])
def update(
    student_id: int,
    body: StudentUpdate,
    ctx: TenantContext = Ctx,
    db: Session = Depends(get_db),
):
    return svc.update_student(db, ctx.organization_id, student_id, body)


@router.delete("/{student_id}", status_code=204, dependencies=[admin])
def delete(student_id: int, ctx: TenantContext = Ctx, db: Session = Depends(get_db)):
    svc.delete_student(db, ctx.organization_id, student_id)
