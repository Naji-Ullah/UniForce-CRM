"""Department CRUD — Manager-scoped (the org's own academic structure)."""
from sqlalchemy.orm import Session

from app.core.errors import ConflictError, NotFoundError
from app.models.academic import Department
from app.schemas.identity import DepartmentCreate, DepartmentUpdate


def create(db: Session, org_id: int, data: DepartmentCreate) -> Department:
    if (
        db.query(Department)
        .filter(
            Department.organization_id == org_id,
            (Department.code == data.code) | (Department.name == data.name),
        )
        .first()
    ):
        raise ConflictError("Department code or name already exists in this organization")
    dept = Department(organization_id=org_id, **data.model_dump())
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept


def list_all(db: Session, org_id: int) -> list[Department]:
    return (
        db.query(Department)
        .filter(Department.organization_id == org_id)
        .order_by(Department.name)
        .all()
    )


def get(db: Session, org_id: int, dept_id: int) -> Department:
    d = (
        db.query(Department)
        .filter(Department.organization_id == org_id, Department.id == dept_id)
        .first()
    )
    if not d:
        raise NotFoundError("Department not found")
    return d


def update(db: Session, org_id: int, dept_id: int, data: DepartmentUpdate) -> Department:
    d = get(db, org_id, dept_id)
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(d, k, v)
    db.commit()
    db.refresh(d)
    return d


def delete(db: Session, org_id: int, dept_id: int) -> None:
    d = get(db, org_id, dept_id)
    db.delete(d)
    db.commit()
