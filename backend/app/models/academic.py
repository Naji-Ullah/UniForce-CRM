"""Academic structure: courses, classes (offerings) and enrollments.

Relationship showcase:
  * organizations (1) ── (N) courses
  * courses (1) ── (N) classes            a class is one offering of a course
  * teachers (1) ── (N) classes           the instructor (many-to-one)
  * students (M) ──< enrollments >── (N) classes   junction / association table
"""
from datetime import datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import EnrollmentStatus
from app.models.mixins import TenantMixin, TimestampMixin


class Course(Base, TenantMixin, TimestampMixin):
    """A catalogue course (e.g. CS-101 Intro to Programming)."""

    __tablename__ = "courses"
    __table_args__ = (
        UniqueConstraint("organization_id", "code", name="uq_course_org_code"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[str | None] = mapped_column(String(1000))
    credit_hours: Mapped[int] = mapped_column(Integer, default=3, nullable=False)

    organization: Mapped["Organization"] = relationship(back_populates="courses")
    classes: Mapped[list["Class"]] = relationship(
        back_populates="course", cascade="all, delete-orphan"
    )


class Class(Base, TenantMixin, TimestampMixin):
    """A scheduled offering/section of a course, taught by one teacher.

    Splitting `courses` (catalogue) from `classes` (term offering) removes the
    repeating-group that would otherwise force term/teacher/room data onto the
    course row — a 2NF/3NF improvement and the reason a course can run every
    semester with different instructors.
    """

    __tablename__ = "classes"
    __table_args__ = (
        UniqueConstraint(
            "organization_id", "course_id", "term", "section",
            name="uq_class_org_course_term_section",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    course_id: Mapped[int] = mapped_column(
        ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # ON DELETE RESTRICT: you cannot delete a teacher who still owns classes —
    # protects the academic record's referential integrity.
    teacher_id: Mapped[int] = mapped_column(
        ForeignKey("teachers.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    section: Mapped[str] = mapped_column(String(16), default="A", nullable=False)
    term: Mapped[str] = mapped_column(String(32), nullable=False)  # e.g. "Fall 2026"
    room: Mapped[str | None] = mapped_column(String(40))
    schedule: Mapped[str | None] = mapped_column(String(120))  # e.g. "Mon/Wed 10:00"
    capacity: Mapped[int] = mapped_column(Integer, default=40, nullable=False)

    course: Mapped["Course"] = relationship(back_populates="classes")
    teacher: Mapped["Teacher"] = relationship(back_populates="classes")
    enrollments: Mapped[list["Enrollment"]] = relationship(
        back_populates="klass", cascade="all, delete-orphan"
    )
    assignments: Mapped[list["Assignment"]] = relationship(
        back_populates="klass", cascade="all, delete-orphan"
    )
    quizzes: Mapped[list["Quiz"]] = relationship(
        back_populates="klass", cascade="all, delete-orphan"
    )
    attendance_records: Mapped[list["Attendance"]] = relationship(
        back_populates="klass", cascade="all, delete-orphan"
    )


class Enrollment(Base, TenantMixin, TimestampMixin):
    """Association table resolving the students <-> classes many-to-many.

    The composite UNIQUE(student_id, class_id) makes a student-in-a-class a
    single fact (no duplicate enrollments) while still allowing the row to
    carry its own attributes (status, final grade) — an *association object*,
    not a bare link table.
    """

    __tablename__ = "enrollments"
    __table_args__ = (
        UniqueConstraint("student_id", "class_id", name="uq_enrollment_student_class"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True
    )
    class_id: Mapped[int] = mapped_column(
        ForeignKey("classes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(
        String(16), default=EnrollmentStatus.ENROLLED.value, nullable=False
    )
    final_grade: Mapped[str | None] = mapped_column(String(4))
    enrolled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    student: Mapped["Student"] = relationship(back_populates="enrollments")
    klass: Mapped["Class"] = relationship(back_populates="enrollments")
