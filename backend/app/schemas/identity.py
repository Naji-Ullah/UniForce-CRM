from datetime import date

from pydantic import BaseModel, EmailStr, Field

from app.schemas.common import ORMModel, TimestampedOut


# --- Teacher --------------------------------------------------------------
class TeacherCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=160)
    password: str = Field(min_length=8)
    employee_code: str = Field(min_length=1, max_length=40)
    department: str | None = None
    phone: str | None = None
    hire_date: date | None = None


class TeacherUpdate(BaseModel):
    full_name: str | None = None
    department: str | None = None
    phone: str | None = None
    hire_date: date | None = None
    is_active: bool | None = None


class TeacherOut(TimestampedOut):
    user_id: int
    organization_id: int
    employee_code: str
    department: str | None
    phone: str | None
    hire_date: date | None
    email: str
    full_name: str
    is_active: bool


# --- Manager --------------------------------------------------------------
class ManagerOut(TimestampedOut):
    user_id: int
    organization_id: int
    title: str
    phone: str | None
    email: str
    full_name: str


# --- Student --------------------------------------------------------------
class StudentCreate(BaseModel):
    enrollment_number: str = Field(min_length=1, max_length=40)
    full_name: str = Field(min_length=2, max_length=160)
    email: EmailStr
    phone: str | None = None
    gender: str | None = None
    date_of_birth: date | None = None
    address: str | None = None
    admission_date: date | None = None


class StudentUpdate(BaseModel):
    full_name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    gender: str | None = None
    date_of_birth: date | None = None
    address: str | None = None
    status: str | None = None


class StudentOut(TimestampedOut):
    organization_id: int
    enrollment_number: str
    full_name: str
    email: str
    phone: str | None
    gender: str | None
    date_of_birth: date | None
    address: str | None
    admission_date: date | None
    status: str
