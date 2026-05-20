from pydantic import BaseModel, EmailStr, Field

from app.schemas.common import TimestampedOut


class OrganizationCreate(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    slug: str = Field(min_length=2, max_length=64, pattern=r"^[a-z0-9-]+$")
    domain: str | None = None
    plan: str = "standard"
    # Optional: provision the organization's first Manager in the same call.
    manager_email: EmailStr | None = None
    manager_name: str | None = None
    manager_password: str | None = Field(default=None, min_length=8)

class OrganizationSignup(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    slug: str = Field(min_length=2, max_length=64, pattern=r"^[a-z0-9-]+$")
    domain: str | None = None
    manager_email: EmailStr
    manager_name: str = Field(min_length=2, max_length=160)
    manager_password: str = Field(min_length=8)


class OrganizationUpdate(BaseModel):
    name: str | None = None
    domain: str | None = None
    plan: str | None = None
    is_active: bool | None = None


class OrganizationOut(TimestampedOut):
    name: str
    slug: str
    domain: str | None
    plan: str
    is_active: bool


class OrganizationStats(BaseModel):
    organization_id: int
    managers: int
    teachers: int
    students: int
    courses: int
    classes: int
