from pydantic import BaseModel, Field

from app.schemas.common import ORMModel, TimestampedOut


# --- Course ---------------------------------------------------------------
class CourseCreate(BaseModel):
    code: str = Field(min_length=2, max_length=32)
    title: str = Field(min_length=2, max_length=160)
    description: str | None = None
    credit_hours: int = Field(default=3, ge=1, le=12)


class CourseUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    credit_hours: int | None = Field(default=None, ge=1, le=12)


class CourseOut(TimestampedOut):
    organization_id: int
    code: str
    title: str
    description: str | None
    credit_hours: int


# --- Class ----------------------------------------------------------------
class ClassCreate(BaseModel):
    course_id: int
    teacher_id: int
    section: str = "A"
    term: str = Field(min_length=2, max_length=32)
    room: str | None = None
    schedule: str | None = None
    capacity: int = Field(default=40, ge=1, le=500)


class ClassUpdate(BaseModel):
    teacher_id: int | None = None
    section: str | None = None
    term: str | None = None
    room: str | None = None
    schedule: str | None = None
    capacity: int | None = Field(default=None, ge=1, le=500)


class ClassOut(TimestampedOut):
    organization_id: int
    course_id: int
    teacher_id: int
    section: str
    term: str
    room: str | None
    schedule: str | None
    capacity: int
    course_code: str | None = None
    course_title: str | None = None
    teacher_name: str | None = None
    enrolled_count: int | None = None


# --- Enrollment -----------------------------------------------------------
class EnrollmentCreate(BaseModel):
    student_id: int
    class_id: int


class EnrollmentUpdate(BaseModel):
    status: str | None = None
    final_grade: str | None = None


class EnrollmentOut(TimestampedOut):
    organization_id: int
    student_id: int
    class_id: int
    status: str
    final_grade: str | None
    student_name: str | None = None
    enrollment_number: str | None = None
