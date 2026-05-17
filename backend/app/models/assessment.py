"""Assessment domain: attendance, assignments + submissions + marks, quizzes.

Relationship showcase:
  * classes (1) ── (N) attendance              one row per student/session
  * classes (1) ── (N) assignments
  * assignments (1) ── (N) assignment_submissions
  * assignment_submissions (1) ── (1) assignment_marks   one-to-one grade
  * classes (1) ── (N) quizzes
  * quizzes (1) ── (N) quiz_marks
"""
from datetime import date, datetime

from sqlalchemy import (
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import AttendanceStatus, SubmissionStatus
from app.models.mixins import TenantMixin, TimestampMixin


class Attendance(Base, TenantMixin, TimestampMixin):
    """One attendance fact per (class, student, date).

    The composite UNIQUE prevents a student being marked twice for the same
    session — the natural key of attendance. Indexed by class+date because the
    hot query is "give me today's sheet for this class".
    """

    __tablename__ = "attendance"
    __table_args__ = (
        UniqueConstraint(
            "class_id", "student_id", "session_date", name="uq_attendance_natural_key"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    class_id: Mapped[int] = mapped_column(
        ForeignKey("classes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    student_id: Mapped[int] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True
    )
    marked_by_teacher_id: Mapped[int | None] = mapped_column(
        ForeignKey("teachers.id", ondelete="SET NULL")
    )
    session_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    status: Mapped[str] = mapped_column(
        String(16), default=AttendanceStatus.PRESENT.value, nullable=False
    )
    remarks: Mapped[str | None] = mapped_column(String(255))

    klass: Mapped["Class"] = relationship(back_populates="attendance_records")
    student: Mapped["Student"] = relationship()


class Assignment(Base, TenantMixin, TimestampMixin):
    __tablename__ = "assignments"

    id: Mapped[int] = mapped_column(primary_key=True)
    class_id: Mapped[int] = mapped_column(
        ForeignKey("classes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_by_teacher_id: Mapped[int | None] = mapped_column(
        ForeignKey("teachers.id", ondelete="SET NULL")
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    max_marks: Mapped[float] = mapped_column(Numeric(6, 2), default=100, nullable=False)
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    klass: Mapped["Class"] = relationship(back_populates="assignments")
    submissions: Mapped[list["AssignmentSubmission"]] = relationship(
        back_populates="assignment", cascade="all, delete-orphan"
    )


class AssignmentSubmission(Base, TenantMixin, TimestampMixin):
    """A student's submission for one assignment (one submission per student)."""

    __tablename__ = "assignment_submissions"
    __table_args__ = (
        UniqueConstraint(
            "assignment_id", "student_id", name="uq_submission_assignment_student"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    assignment_id: Mapped[int] = mapped_column(
        ForeignKey("assignments.id", ondelete="CASCADE"), nullable=False, index=True
    )
    student_id: Mapped[int] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True
    )
    content: Mapped[str | None] = mapped_column(Text)
    file_url: Mapped[str | None] = mapped_column(String(512))
    status: Mapped[str] = mapped_column(
        String(16), default=SubmissionStatus.SUBMITTED.value, nullable=False
    )
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    assignment: Mapped["Assignment"] = relationship(back_populates="submissions")
    student: Mapped["Student"] = relationship()
    # One-to-one: a submission has at most one grade record.
    mark: Mapped["AssignmentMark"] = relationship(
        back_populates="submission", uselist=False, cascade="all, delete-orphan"
    )


class AssignmentMark(Base, TenantMixin, TimestampMixin):
    """The grade for a submission — split out as a true 1:1.

    Keeping the mark in its own table separates the *act of grading* (who,
    when, feedback) from the *act of submitting*. The UNIQUE FK enforces the
    one-to-one cardinality at the database level.
    """

    __tablename__ = "assignment_marks"

    id: Mapped[int] = mapped_column(primary_key=True)
    submission_id: Mapped[int] = mapped_column(
        ForeignKey("assignment_submissions.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    graded_by_teacher_id: Mapped[int | None] = mapped_column(
        ForeignKey("teachers.id", ondelete="SET NULL")
    )
    marks_obtained: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False)
    feedback: Mapped[str | None] = mapped_column(Text)
    graded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    submission: Mapped["AssignmentSubmission"] = relationship(back_populates="mark")


class Quiz(Base, TenantMixin, TimestampMixin):
    __tablename__ = "quizzes"

    id: Mapped[int] = mapped_column(primary_key=True)
    class_id: Mapped[int] = mapped_column(
        ForeignKey("classes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_by_teacher_id: Mapped[int | None] = mapped_column(
        ForeignKey("teachers.id", ondelete="SET NULL")
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    topic: Mapped[str | None] = mapped_column(String(200))
    total_marks: Mapped[float] = mapped_column(Numeric(6, 2), default=20, nullable=False)
    quiz_date: Mapped[date | None] = mapped_column(Date)

    klass: Mapped["Class"] = relationship(back_populates="quizzes")
    marks: Mapped[list["QuizMark"]] = relationship(
        back_populates="quiz", cascade="all, delete-orphan"
    )


class QuizMark(Base, TenantMixin, TimestampMixin):
    __tablename__ = "quiz_marks"
    __table_args__ = (
        UniqueConstraint("quiz_id", "student_id", name="uq_quizmark_quiz_student"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    quiz_id: Mapped[int] = mapped_column(
        ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    student_id: Mapped[int] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True
    )
    marks_obtained: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False)
    remarks: Mapped[str | None] = mapped_column(String(255))

    quiz: Mapped["Quiz"] = relationship(back_populates="marks")
    student: Mapped["Student"] = relationship()
