"""Teacher & student management (Manager creates teachers; Teacher creates students).

Creating a teacher is a transaction spanning two tables (`users` +
`teachers`): a teacher must always have a login, so the account and profile
are committed together or not at all.
"""
from sqlalchemy.orm import Session

from app.core.errors import ConflictError, NotFoundError
from app.core.security import hash_password
from app.models.enums import RoleName
from app.models.identity import Role, Student, Teacher, User
from app.repositories.repos import StudentRepository, TeacherRepository, UserRepository
from app.schemas.identity import (
    StudentCreate,
    StudentUpdate,
    TeacherCreate,
    TeacherUpdate,
)


def _teacher_role_id(db: Session) -> int:
    role = db.query(Role).filter(Role.name == RoleName.TEACHER.value).one()
    return role.id


def teacher_to_out(t: Teacher) -> dict:
    return {
        **{c.name: getattr(t, c.name) for c in t.__table__.columns},
        "department_name": t.department.name if t.department else None,
        "email": t.user.email,
        "full_name": t.user.full_name,
        "is_active": t.user.is_active,
    }


def _student_role_id(db: Session) -> int:
    role = db.query(Role).filter(Role.name == RoleName.STUDENT.value).one()
    return role.id


# --- Teachers -------------------------------------------------------------
def create_teacher(db: Session, org_id: int, data: TeacherCreate) -> Teacher:
    if UserRepository(db, None).by_email(data.email):
        raise ConflictError("Email already in use")
    dup = (
        db.query(Teacher)
        .filter(Teacher.organization_id == org_id, Teacher.employee_code == data.employee_code)
        .first()
    )
    if dup:
        raise ConflictError("Employee code already used in this organization")
    try:
        user = User(
            organization_id=org_id,
            role_id=_teacher_role_id(db),
            email=data.email.lower(),
            full_name=data.full_name,
            hashed_password=hash_password(data.password),
        )
        db.add(user)
        db.flush()
        teacher = Teacher(
            user_id=user.id,
            organization_id=org_id,
            employee_code=data.employee_code,
            department_id=data.department_id,
            phone=data.phone,
            hire_date=data.hire_date,
        )
        db.add(teacher)
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(teacher)
    return teacher


def list_teachers(db: Session, org_id: int, limit: int, offset: int) -> list[Teacher]:
    return TeacherRepository(db, org_id).list(limit=limit, offset=offset)


def get_teacher(db: Session, org_id: int, teacher_id: int) -> Teacher:
    t = TeacherRepository(db, org_id).get(teacher_id)
    if not t:
        raise NotFoundError("Teacher not found")
    return t


def update_teacher(db: Session, org_id: int, teacher_id: int, data: TeacherUpdate) -> Teacher:
    t = get_teacher(db, org_id, teacher_id)
    payload = data.model_dump(exclude_unset=True)
    if "full_name" in payload:
        t.user.full_name = payload.pop("full_name")
    if "is_active" in payload:
        t.user.is_active = payload.pop("is_active")
    for k, v in payload.items():
        setattr(t, k, v)
    db.commit()
    db.refresh(t)
    return t


def delete_teacher(db: Session, org_id: int, teacher_id: int) -> None:
    t = get_teacher(db, org_id, teacher_id)
    # Deleting the user cascades to the teacher profile (FK ON DELETE CASCADE).
    db.delete(t.user)
    db.commit()


# --- Students -------------------------------------------------------------
def create_student(db: Session, org_id: int, data: StudentCreate) -> Student:
    dup = (
        db.query(Student)
        .filter(
            Student.organization_id == org_id,
            Student.enrollment_number == data.enrollment_number,
        )
        .first()
    )
    if dup:
        raise ConflictError("Enrollment number already exists in this organization")

    payload = data.model_dump()
    password = payload.pop("password", None)

    try:
        user_id: int | None = None
        if password:
            if UserRepository(db, None).by_email(payload["email"]):
                raise ConflictError("Email already in use")
            user = User(
                organization_id=org_id,
                role_id=_student_role_id(db),
                email=payload["email"].lower(),
                full_name=payload["full_name"],
                hashed_password=hash_password(password),
            )
            db.add(user)
            db.flush()
            user_id = user.id

        student = Student(organization_id=org_id, user_id=user_id, **payload)
        db.add(student)
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(student)
    return student


def list_students(db: Session, org_id: int, limit: int, offset: int) -> list[Student]:
    return StudentRepository(db, org_id).list(limit=limit, offset=offset)


def get_student(db: Session, org_id: int, student_id: int) -> Student:
    s = StudentRepository(db, org_id).get(student_id)
    if not s:
        raise NotFoundError("Student not found")
    return s


def update_student(db: Session, org_id: int, student_id: int, data: StudentUpdate) -> Student:
    s = get_student(db, org_id, student_id)
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(s, k, v)
    db.commit()
    db.refresh(s)
    return s


def delete_student(db: Session, org_id: int, student_id: int) -> None:
    s = get_student(db, org_id, student_id)
    db.delete(s)
    db.commit()
