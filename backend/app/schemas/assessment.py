from datetime import date, datetime

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel, TimestampedOut


# --- Attendance -----------------------------------------------------------
class AttendanceEntry(BaseModel):
    student_id: int
    status: str = "PRESENT"
    remarks: str | None = None


class AttendanceBulkCreate(BaseModel):
    """Mark a whole class for one session in a single transaction."""

    class_id: int
    session_date: date
    entries: list[AttendanceEntry]


class AttendanceOut(TimestampedOut):
    organization_id: int
    class_id: int
    student_id: int
    session_date: date
    status: str
    remarks: str | None
    student_name: str | None = None


class AttendanceSummary(BaseModel):
    student_id: int
    student_name: str
    total_sessions: int
    present: int
    absent: int
    late: int
    excused: int
    attendance_percentage: float


# --- Assignment -----------------------------------------------------------
class AssignmentCreate(BaseModel):
    class_id: int
    title: str = Field(min_length=2, max_length=200)
    description: str | None = None
    max_marks: float = Field(default=100, gt=0)
    due_date: datetime | None = None


class AssignmentOut(TimestampedOut):
    organization_id: int
    class_id: int
    title: str
    description: str | None
    max_marks: float
    due_date: datetime | None


class SubmissionCreate(BaseModel):
    assignment_id: int
    student_id: int
    content: str | None = None
    file_url: str | None = None


class MarkCreate(BaseModel):
    submission_id: int
    marks_obtained: float = Field(ge=0)
    feedback: str | None = None


class SubmissionOut(TimestampedOut):
    organization_id: int
    assignment_id: int
    student_id: int
    content: str | None
    file_url: str | None
    status: str
    submitted_at: datetime | None
    student_name: str | None = None
    marks_obtained: float | None = None
    feedback: str | None = None


# --- Quiz -----------------------------------------------------------------
class QuizCreate(BaseModel):
    class_id: int
    title: str = Field(min_length=2, max_length=200)
    topic: str | None = None
    total_marks: float = Field(default=20, gt=0)
    quiz_date: date | None = None


class QuizOut(TimestampedOut):
    organization_id: int
    class_id: int
    title: str
    topic: str | None
    total_marks: float
    quiz_date: date | None


class QuizMarkEntry(BaseModel):
    student_id: int
    marks_obtained: float = Field(ge=0)
    remarks: str | None = None


class QuizMarkBulkCreate(BaseModel):
    quiz_id: int
    entries: list[QuizMarkEntry]


class QuizMarkOut(TimestampedOut):
    organization_id: int
    quiz_id: int
    student_id: int
    marks_obtained: float
    remarks: str | None
    student_name: str | None = None
