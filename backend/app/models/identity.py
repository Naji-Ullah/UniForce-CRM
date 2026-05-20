"""Identity & access tables: roles, users, and the manager/teacher profiles.

Relationship showcase in this module:
  * roles (1) ── (N) users          one-to-many lookup, normalised to 3NF
  * users (1) ── (1) managers       one-to-one profile extension
  * users (1) ── (1) teachers       one-to-one profile extension
  * organizations (1) ── (N) users  tenant ownership

`students` deliberately are NOT users: per the role spec students do not log
in, so modelling them as login accounts would be denormalised dead weight.
"""
from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import StudentStatus
from app.models.mixins import TenantMixin, TimestampMixin


class Role(Base):
    """Lookup table for the three platform roles.

    Kept as a table (not just an enum) so role metadata is stored once and
    referenced by FK — textbook 3NF: no transitive dependency of role
    description on the user.
    """

    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(32), unique=True, nullable=False, index=True)
    description: Mapped[str] = mapped_column(String(255), nullable=False)

    users: Mapped[list["User"]] = relationship(back_populates="role")


class User(Base, TimestampMixin):
    """A login account.

    `organization_id` is nullable on purpose: the Head Admin is a platform-level
    actor that owns no single tenant. Every other user MUST belong to exactly
    one organization (enforced in the service layer + a partial expectation in
    seed/validation).
    """

    __tablename__ = "users"
    __table_args__ = (
        # Email is the login identifier and must be globally unique across the
        # whole platform (auth happens before a tenant is known).
        UniqueConstraint("email", name="uq_users_email"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    organization_id: Mapped[int | None] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id", ondelete="RESTRICT"), index=True)

    email: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(160), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    organization: Mapped["Organization"] = relationship(back_populates="users")
    role: Mapped["Role"] = relationship(back_populates="users")

    # One-to-one profile extensions (uselist=False). A user is at most one of
    # these; the FK + unique constraint live on the child side.
    manager_profile: Mapped["Manager"] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    teacher_profile: Mapped["Teacher"] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    student_profile: Mapped["Student"] = relationship(
        back_populates="user", uselist=False
    )


class Manager(Base, TenantMixin, TimestampMixin):
    """One-to-one extension of a MANAGER user with org-admin metadata."""

    __tablename__ = "managers"

    id: Mapped[int] = mapped_column(primary_key=True)
    # UNIQUE FK == one-to-one: a user row maps to at most one manager row.
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(120), default="Manager", nullable=False)
    phone: Mapped[str | None] = mapped_column(String(40))

    user: Mapped["User"] = relationship(back_populates="manager_profile")


class Teacher(Base, TenantMixin, TimestampMixin):
    """One-to-one extension of a TEACHER user with HR/academic metadata."""

    __tablename__ = "teachers"
    __table_args__ = (
        # Employee code is unique *within* a tenant, not globally — two
        # universities may both have a "T-001". Composite unique = tenant-safe.
        UniqueConstraint("organization_id", "employee_code", name="uq_teacher_org_code"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    employee_code: Mapped[str] = mapped_column(String(40), nullable=False)
    department_id: Mapped[int | None] = mapped_column(
        ForeignKey("departments.id", ondelete="SET NULL"), index=True
    )
    phone: Mapped[str | None] = mapped_column(String(40))
    hire_date: Mapped[date | None] = mapped_column(Date)

    user: Mapped["User"] = relationship(back_populates="teacher_profile")
    department: Mapped["Department | None"] = relationship(back_populates="teachers")

    classes: Mapped[list["Class"]] = relationship(back_populates="teacher")


class Student(Base, TenantMixin, TimestampMixin):
    """A learner record (no login). Owned by a tenant; enrolled into classes."""

    __tablename__ = "students"
    __table_args__ = (
        UniqueConstraint(
            "organization_id", "enrollment_number", name="uq_student_org_enrollment"
        ),
        UniqueConstraint("organization_id", "email", name="uq_student_org_email"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    # Optional login: when set, the student can sign in via this user account.
    # Nullable so legacy/imported students without a login still work.
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), unique=True, index=True
    )
    enrollment_number: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(160), nullable=False)
    email: Mapped[str] = mapped_column(String(160), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(40))
    gender: Mapped[str | None] = mapped_column(String(16))
    date_of_birth: Mapped[date | None] = mapped_column(Date)
    address: Mapped[str | None] = mapped_column(String(255))
    admission_date: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(
        String(16), default=StudentStatus.ACTIVE.value, nullable=False
    )

    organization: Mapped["Organization"] = relationship(back_populates="students")
    user: Mapped["User | None"] = relationship(back_populates="student_profile")
    enrollments: Mapped[list["Enrollment"]] = relationship(
        back_populates="student", cascade="all, delete-orphan"
    )
