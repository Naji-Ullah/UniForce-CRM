from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import TenantContext, get_tenant, require_roles
from app.models.enums import RoleName
from app.schemas.identity import DepartmentCreate, DepartmentOut, DepartmentUpdate
from app.services import department_service as svc

router = APIRouter(prefix="/departments", tags=["departments"])
Ctx = Depends(get_tenant)
staff = Depends(require_roles(RoleName.MANAGER, RoleName.HEAD_ADMIN, RoleName.TEACHER))
admin = Depends(require_roles(RoleName.MANAGER, RoleName.HEAD_ADMIN))


@router.get("", response_model=list[DepartmentOut], dependencies=[staff])
def list_(ctx: TenantContext = Ctx, db: Session = Depends(get_db)):
    return svc.list_all(db, ctx.organization_id)


@router.post("", response_model=DepartmentOut, status_code=201, dependencies=[admin])
def create(body: DepartmentCreate, ctx: TenantContext = Ctx, db: Session = Depends(get_db)):
    return svc.create(db, ctx.organization_id, body)


@router.patch("/{dept_id}", response_model=DepartmentOut, dependencies=[admin])
def update(dept_id: int, body: DepartmentUpdate,
           ctx: TenantContext = Ctx, db: Session = Depends(get_db)):
    return svc.update(db, ctx.organization_id, dept_id, body)


@router.delete("/{dept_id}", status_code=204, dependencies=[admin])
def delete(dept_id: int, ctx: TenantContext = Ctx, db: Session = Depends(get_db)):
    svc.delete(db, ctx.organization_id, dept_id)
