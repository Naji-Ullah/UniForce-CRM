from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import TenantContext, get_tenant, require_roles
from app.models.enums import RoleName
from app.schemas.identity import StudentCreate, StudentOut, StudentUpdate
from app.services import people_service as svc

router = APIRouter(prefix="/students", tags=["students"])
Ctx = Depends(get_tenant)
# Teachers create/manage students; Managers & Head Admin may too.
staff = Depends(require_roles(RoleName.TEACHER, RoleName.MANAGER, RoleName.HEAD_ADMIN))


@router.post("", response_model=StudentOut, status_code=201, dependencies=[staff])
def create(body: StudentCreate, ctx: TenantContext = Ctx, db: Session = Depends(get_db)):
    return svc.create_student(db, ctx.organization_id, body)


@router.get("", response_model=list[StudentOut])
def list_(
    ctx: TenantContext = Ctx,
    db: Session = Depends(get_db),
    limit: int = Query(50, le=200),
    offset: int = 0,
):
    return svc.list_students(db, ctx.organization_id, limit, offset)


@router.get("/{student_id}", response_model=StudentOut)
def get(student_id: int, ctx: TenantContext = Ctx, db: Session = Depends(get_db)):
    return svc.get_student(db, ctx.organization_id, student_id)


@router.patch("/{student_id}", response_model=StudentOut, dependencies=[staff])
def update(
    student_id: int,
    body: StudentUpdate,
    ctx: TenantContext = Ctx,
    db: Session = Depends(get_db),
):
    return svc.update_student(db, ctx.organization_id, student_id, body)


@router.delete("/{student_id}", status_code=204, dependencies=[staff])
def delete(student_id: int, ctx: TenantContext = Ctx, db: Session = Depends(get_db)):
    svc.delete_student(db, ctx.organization_id, student_id)
