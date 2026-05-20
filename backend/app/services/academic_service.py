"""Courses, classes (offerings) and enrollments."""
from sqlalchemy.orm import Session

from app.core.errors import ConflictError, NotFoundError
from app.models.academic import Class, Course, Enrollment
from app.repositories.repos import (
    ClassRepository,
    CourseRepository,
    EnrollmentRepository,
    StudentRepository,
    TeacherRepository,
)
from app.schemas.academic import (
    ClassCreate,
    ClassUpdate,
    CourseCreate,
    CourseUpdate,
    EnrollmentCreate,
    EnrollmentUpdate,
)


# --- Courses --------------------------------------------------------------
def create_course(db: Session, org_id: int, data: CourseCreate) -> Course:
    if db.query(Course).filter(
        Course.organization_id == org_id, Course.code == data.code
    ).first():
        raise ConflictError("Course code already exists in this organization")
    course = Course(organization_id=org_id, **data.model_dump())
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


def list_courses(db: Session, org_id: int, limit: int, offset: int) -> list[Course]:
    return CourseRepository(db, org_id).list(limit=limit, offset=offset)


def update_course(db: Session, org_id: int, course_id: int, data: CourseUpdate) -> Course:
    c = CourseRepository(db, org_id).get(course_id)
    if not c:
        raise NotFoundError("Course not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(c, k, v)
    db.commit()
    db.refresh(c)
    return c


def delete_course(db: Session, org_id: int, course_id: int) -> None:
    c = CourseRepository(db, org_id).get(course_id)
    if not c:
        raise NotFoundError("Course not found")
    db.delete(c)
    db.commit()


# --- Classes --------------------------------------------------------------
def create_class(db: Session, org_id: int, data: ClassCreate) -> Class:
    # Cross-tenant safety: course and teacher must belong to THIS org.
    if not CourseRepository(db, org_id).get(data.course_id):
        raise NotFoundError("Course not found in this organization")
    if not TeacherRepository(db, org_id).get(data.teacher_id):
        raise NotFoundError("Teacher not found in this organization")
    klass = Class(organization_id=org_id, **data.model_dump())
    db.add(klass)
    db.commit()
    db.refresh(klass)
    return klass


def list_classes(
    db: Session, org_id: int, limit: int, offset: int,
    *, teacher_id: int | None = None,
) -> list[Class]:
    q = db.query(Class).filter(Class.organization_id == org_id)
    if teacher_id is not None:
        q = q.filter(Class.teacher_id == teacher_id)
    return q.order_by(Class.id.desc()).limit(limit).offset(offset).all()


def get_class(db: Session, org_id: int, class_id: int) -> Class:
    k = ClassRepository(db, org_id).get(class_id)
    if not k:
        raise NotFoundError("Class not found")
    return k


def update_class(db: Session, org_id: int, class_id: int, data: ClassUpdate) -> Class:
    k = get_class(db, org_id, class_id)
    payload = data.model_dump(exclude_unset=True)
    if "teacher_id" in payload and not TeacherRepository(db, org_id).get(payload["teacher_id"]):
        raise NotFoundError("Teacher not found in this organization")
    for kk, vv in payload.items():
        setattr(k, kk, vv)
    db.commit()
    db.refresh(k)
    return k


def delete_class(db: Session, org_id: int, class_id: int) -> None:
    k = get_class(db, org_id, class_id)
    db.delete(k)
    db.commit()


# --- Enrollments (the M:N join) ------------------------------------------
def enroll(db: Session, org_id: int, data: EnrollmentCreate) -> Enrollment:
    if not StudentRepository(db, org_id).get(data.student_id):
        raise NotFoundError("Student not found in this organization")
    if not ClassRepository(db, org_id).get(data.class_id):
        raise NotFoundError("Class not found in this organization")
    if EnrollmentRepository(db, org_id).exists(data.student_id, data.class_id):
        raise ConflictError("Student is already enrolled in this class")
    e = Enrollment(
        organization_id=org_id, student_id=data.student_id, class_id=data.class_id
    )
    db.add(e)
    db.commit()
    db.refresh(e)
    return e


def list_enrollments(db: Session, org_id: int, class_id: int) -> list[Enrollment]:
    return EnrollmentRepository(db, org_id).for_class(class_id)


def update_enrollment(
    db: Session, org_id: int, enrollment_id: int, data: EnrollmentUpdate
) -> Enrollment:
    e = EnrollmentRepository(db, org_id).get(enrollment_id)
    if not e:
        raise NotFoundError("Enrollment not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(e, k, v)
    db.commit()
    db.refresh(e)
    return e


def unenroll(db: Session, org_id: int, enrollment_id: int) -> None:
    e = EnrollmentRepository(db, org_id).get(enrollment_id)
    if not e:
        raise NotFoundError("Enrollment not found")
    db.delete(e)
    db.commit()
