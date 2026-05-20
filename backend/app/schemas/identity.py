from datetime import date

from pydantic import BaseModel, EmailStr, Field

from app.schemas.common import ORMModel, TimestampedOut


# --- Department -----------------------------------------------------------
class DepartmentCreate(BaseModel):
    code: str = Field(min_length=1, max_length=16)
    name: str = Field(min_length=2, max_length=120)
    description: str | None = None


class DepartmentUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class DepartmentOut(TimestampedOut):
    organization_id: int
    code: str
    name: str
    description: str | None


# --- Teacher --------------------------------------------------------------
class TeacherCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=160)
    password: str = Field(min_length=8)
    employee_code: str = Field(min_length=1, max_length=40)
    department_id: int | None = None
    phone: str | None = None
    hire_date: date | None = None


class TeacherUpdate(BaseModel):
    full_name: str | None = None
    department_id: int | None = None
    phone: str | None = None
    hire_date: date | None = None
    is_active: bool | None = None


class TeacherOut(TimestampedOut):
    user_id: int
    organization_id: int
    employee_code: str
    department_id: int | None
    department_name: str | None
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
    # If provided, the student also gets a STUDENT-role login account using
    # `email` as the username. Omit to keep the student record login-less.
    password: str | None = Field(default=None, min_length=8)


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
    user_id: int | None
    enrollment_number: str
    full_name: str
    email: str
    phone: str | None
    gender: str | None
    date_of_birth: date | None
    address: str | None
    admission_date: date | None
    status: str
