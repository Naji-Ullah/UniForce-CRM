"""Platform-level organization management (Head Admin only).

`create` runs as ONE transaction: the organization, an optional first Manager
user, and that user's manager profile either all commit or all roll back. This
is the canonical example of a multi-statement transaction in the project.
"""
from sqlalchemy.orm import Session

from app.core.errors import ConflictError, NotFoundError
from app.core.security import hash_password
from app.models.enums import RoleName
from app.models.identity import Manager, Role, Student, Teacher, User
from app.models.academic import Class, Course
from app.models.organization import Organization
from app.repositories.repos import OrganizationRepository
from app.schemas.organization import OrganizationCreate, OrganizationUpdate, OrganizationStats


def _role(db: Session, name: RoleName) -> Role:
    role = db.query(Role).filter(Role.name == name.value).one_or_none()
    if role is None:  # roles are seeded; absence is a setup bug, surface it
        raise NotFoundError(f"Role {name.value} is not seeded")
    return role


def _email_taken(db: Session, email: str) -> bool:
    return db.query(User).filter(User.email == email.lower()).first() is not None


def create(db: Session, data: OrganizationCreate) -> Organization:
    repo = OrganizationRepository(db, None)
    if repo.by_slug(data.slug):
        raise ConflictError(f"Slug '{data.slug}' is already taken")

    try:
        org = Organization(
            name=data.name, slug=data.slug, domain=data.domain, plan=data.plan
        )
        db.add(org)
        db.flush()  # need org.id for the manager below

        if data.manager_email:
            if not (data.manager_password and data.manager_name):
                raise ConflictError("manager_name and manager_password are required")
            if _email_taken(db, data.manager_email):
                raise ConflictError("Manager email already in use")
            manager_user = User(
                organization_id=org.id,
                role_id=_role(db, RoleName.MANAGER).id,
                email=data.manager_email.lower(),
                full_name=data.manager_name,
                hashed_password=hash_password(data.manager_password),
            )
            db.add(manager_user)
            db.flush()
            db.add(Manager(user_id=manager_user.id, organization_id=org.id))

        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(org)
    return org


def update(db: Session, org_id: int, data: OrganizationUpdate) -> Organization:
    repo = OrganizationRepository(db, None)
    org = repo.get(org_id)
    if not org:
        raise NotFoundError("Organization not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(org, field, value)
    db.commit()
    db.refresh(org)
    return org


def list_all(db: Session, limit: int, offset: int):
    return OrganizationRepository(db, None).list(limit=limit, offset=offset)


def get(db: Session, org_id: int) -> Organization:
    org = OrganizationRepository(db, None).get(org_id)
    if not org:
        raise NotFoundError("Organization not found")
    return org


def stats(db: Session, org_id: int) -> OrganizationStats:
    get(db, org_id)  # existence + (implicitly) head-admin scope
    q = lambda model: db.query(model).filter(model.organization_id == org_id).count()
    return OrganizationStats(
        organization_id=org_id,
        managers=q(Manager),
        teachers=q(Teacher),
        students=q(Student),
        courses=q(Course),
        classes=q(Class),
    )
