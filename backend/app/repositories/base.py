"""Tenant-aware repository base.

The whole point of this layer: **every read and write is forced through an
`organization_id` filter**. Services never hand-write `WHERE organization_id`
clauses, so a single forgotten filter can't leak one university's data into
another's. Tenant isolation is a property of the architecture, not of
developer discipline.
"""
from typing import Generic, TypeVar

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import Base

ModelT = TypeVar("ModelT", bound=Base)


class TenantRepository(Generic[ModelT]):
    model: type[ModelT]

    def __init__(self, db: Session, organization_id: int | None):
        self.db = db
        # None == platform scope (Head Admin). Tenant users always pass an int.
        self.organization_id = organization_id

    # -- internal: the mandatory tenant predicate ------------------------
    def _scoped(self):
        stmt = select(self.model)
        if self.organization_id is not None:
            stmt = stmt.where(self.model.organization_id == self.organization_id)
        return stmt

    # -- reads -----------------------------------------------------------
    def get(self, obj_id: int) -> ModelT | None:
        stmt = self._scoped().where(self.model.id == obj_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def list(self, *, limit: int = 50, offset: int = 0, order_by=None):
        stmt = self._scoped()
        stmt = stmt.order_by(order_by if order_by is not None else self.model.id.desc())
        return self.db.execute(stmt.limit(limit).offset(offset)).scalars().all()

    def count(self) -> int:
        stmt = select(func.count()).select_from(self.model)
        if self.organization_id is not None:
            stmt = stmt.where(self.model.organization_id == self.organization_id)
        return self.db.execute(stmt).scalar_one()

    # -- writes (flush, do not commit: the service owns the transaction) -
    def add(self, obj: ModelT) -> ModelT:
        self.db.add(obj)
        self.db.flush()
        return obj

    def delete(self, obj: ModelT) -> None:
        self.db.delete(obj)
        self.db.flush()
