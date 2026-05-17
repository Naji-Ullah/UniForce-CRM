# Database Architecture

This document is the heart of the project. It explains the schema, every
relationship, the normalization decisions, the indexing strategy, and exactly
how multi-tenant isolation is guaranteed.

> Stack: **PostgreSQL 16** · **SQLAlchemy 2.0** (declarative `Mapped[]`) ·
> **Alembic** migrations. Models live in `backend/app/models/`.

---

## 1. ERD (text form)

```
                         ┌───────────────────┐
                         │   organizations   │  ← TENANT ROOT
                         │  id (PK)           │
                         │  slug (UQ)         │
                         └─────────┬─────────┘
                                   │ 1
        ┌──────────────────────────┼───────────────────────────────┐
        │ N                        │ N                              │ N
 ┌──────┴──────┐           ┌───────┴────────┐               ┌───────┴───────┐
 │   users     │           │    students    │               │    courses    │
 │ id (PK)     │           │ id (PK)        │               │ id (PK)       │
 │ org_id (FK) │           │ org_id (FK)    │               │ org_id (FK)   │
 │ role_id(FK) │           │ enroll_no      │               │ code          │
 │ email (UQ)  │           └───────┬────────┘               └───────┬───────┘
 └──┬───┬──────┘                   │ M                              │ 1
1:1 │   │ 1:1                      │                                │ N
 ┌──┴─┐ ┌┴─────┐            ┌──────┴────────┐               ┌───────┴───────┐
 │mgr │ │teacher│───────────│  enrollments  │───────────────│    classes    │
 │    │ │ id PK │ 1       N │ student_id FK │ N           1 │ id (PK)       │
 └────┘ └───┬───┘           │ class_id   FK │               │ course_id FK  │
            │ 1   (teaches)  │ UQ(stu,cls)   │               │ teacher_id FK │
            │ N              └───────────────┘               └───┬───┬───┬───┘
            └──────────────────────────────────────────────────┘ │   │   │
                                                              N   │ N │ N │
                                ┌───────────────┬─────────────────┘   │   │
                                │               │                     │   │
                        ┌───────┴──────┐ ┌──────┴───────┐    ┌─────────┴─┐ │
                        │  attendance  │ │  assignments │    │  quizzes  │ │
                        │ UQ(cls,stu,  │ │  id (PK)     │    │  id (PK)  │ │
                        │    date)     │ └──────┬───────┘    └─────┬─────┘ │
                        └──────────────┘        │ 1                │ 1     │
                                                │ N                │ N     │
                                   ┌────────────┴─────────┐ ┌──────┴─────┐ │
                                   │ assignment_submissions│ │ quiz_marks │ │
                                   │  UQ(assignment,stu)   │ │ UQ(quiz,   │ │
                                   └────────────┬──────────┘ │    stu)    │ │
                                                │ 1:1        └────────────┘ │
                                       ┌────────┴─────────┐                 │
                                       │ assignment_marks │   ┌─────────────┴┐
                                       │  submission_id UQ│   │   reports    │
                                       └──────────────────┘   │ audit trail  │
                                                               └──────────────┘
```

16 tables: `organizations, roles, users, managers, teachers, students,
courses, classes, enrollments, attendance, assignments,
assignment_submissions, assignment_marks, quizzes, quiz_marks, reports`.

---

## 2. Relationship catalogue

| # | Relationship | Cardinality | Where enforced | Why it exists |
|---|--------------|-------------|----------------|---------------|
| 1 | organizations → users | 1 : N | `users.organization_id` FK (nullable for Head Admin) | Tenant ownership of accounts |
| 2 | roles → users | 1 : N | `users.role_id` FK (ON DELETE RESTRICT) | Normalised role lookup (3NF) |
| 3 | users ↔ managers | 1 : 1 | `managers.user_id` **UNIQUE** FK | Profile extension without nullable columns on `users` |
| 4 | users ↔ teachers | 1 : 1 | `teachers.user_id` **UNIQUE** FK | Same — HR/academic attributes only teachers have |
| 5 | organizations → students | 1 : N | `students.organization_id` FK | Tenant-owned learner records |
| 6 | organizations → courses | 1 : N | `courses.organization_id` FK | Tenant catalogue |
| 7 | courses → classes | 1 : N | `classes.course_id` FK | A course runs many times (terms/sections) |
| 8 | teachers → classes | 1 : N (M:1 from class) | `classes.teacher_id` FK (RESTRICT) | The instructor of an offering |
| 9 | students ↔ classes | **M : N** | `enrollments` junction, `UQ(student_id,class_id)` | Students take many classes; classes have many students |
| 10 | classes → attendance | 1 : N | `attendance.class_id` FK, `UQ(class,student,date)` | One attendance fact per session |
| 11 | classes → assignments | 1 : N | `assignments.class_id` FK | Coursework belongs to an offering |
| 12 | assignments → assignment_submissions | 1 : N | `UQ(assignment,student)` | One submission per student per assignment |
| 13 | assignment_submissions ↔ assignment_marks | **1 : 1** | `assignment_marks.submission_id` **UNIQUE** FK | Separates *submitting* from *grading* |
| 14 | classes → quizzes | 1 : N | `quizzes.class_id` FK | Quizzes belong to an offering |
| 15 | quizzes → quiz_marks | 1 : N | `UQ(quiz,student)` | One mark per student per quiz |
| 16 | organizations → reports | 1 : N | `reports.organization_id` FK | Per-tenant audit of generated PDFs |

**One-to-One** examples: #3, #4, #13.
**One-to-Many / Many-to-One** examples: #1, #2, #5–8, #10–12, #14, #15.
**Many-to-Many (junction/association object)**: #9 (`enrollments` even carries
its own attributes — `status`, `final_grade` — making it an *association
object*, not a bare link table).

---

## 3. Normalization (to 3NF)

* **1NF** — every column is atomic; no repeating groups. Marking a class is
  modelled as N rows in `attendance`, never a comma-list on `classes`.
* **2NF** — no partial dependency on a composite key. `enrollments` uses a
  surrogate `id`; its descriptive attributes (`status`, `final_grade`) depend
  on the *whole* student+class pair, not part of it.
* **3NF** — no transitive dependencies:
  * Role description lives in `roles`, **not** repeated on every `users` row.
  * Course catalogue data (`title`, `credit_hours`) lives in `courses`; a
    `classes` row only references `course_id`. The classic course-vs-offering
    split removes the term/teacher/room repeating group that would otherwise
    sit on a course.
  * Grading metadata (`graded_by`, `graded_at`, `feedback`) is in
    `assignment_marks`, not denormalised onto `assignment_submissions`.

A deliberate, documented exception: `reports.params` is `JSONB`. Report filter
sets are sparse and evolving; a normalised "report_param" table would add
joins for zero integrity benefit. This is a pragmatic, indexed semi-structured
column, not accidental denormalization.

---

## 4. Multi-tenant isolation (the core guarantee)

**Strategy:** shared database, shared schema, `organization_id` discriminator
on every tenant-scoped table.

Three independent layers must all agree before any row is returned:

1. **Schema** — `TenantMixin` puts an indexed `organization_id` FK
   (`ON DELETE CASCADE`) on all 14 tenant tables. No tenant row can exist
   without an owning organization; deleting an org atomically erases its data.
2. **Repository** (`repositories/base.py`) — *every* query is built by
   `_scoped()`, which injects `WHERE organization_id = :ctx`. Services never
   hand-write the predicate, so a single omission cannot leak data.
3. **API dependency** (`core/deps.py::get_tenant`) — for Manager/Teacher the
   org id is taken **from the JWT/user row** and a `?organization_id=` query
   param is *ignored*. A forged id cannot widen scope. Only the Head Admin may
   explicitly target an org.

Result: a Manager at "Northfield" issuing `GET /students` can only ever read
Northfield students — enforced architecturally, not by discipline.

`users.email` carries a **platform-wide** unique constraint (login happens
before a tenant is known); business identifiers like `students.enrollment_number`
and `teachers.employee_code` are unique **per-organization** via composite
constraints, so two universities may reuse the same codes safely.

---

## 5. Indexing strategy

| Index | Reason |
|-------|--------|
| `organization_id` on every tenant table | Every tenant-safe query filters on it — highest-selectivity hot path |
| `users.email` (unique) | Login lookup |
| `roles.name` (unique) | Role resolution on every auth |
| FK columns (`course_id`, `teacher_id`, `class_id`, `student_id`, …) | Join performance + FK constraint checks |
| `attendance(class_id, student_id, session_date)` UNIQUE | Natural key; also serves the "today's sheet" query |
| `enrollments(student_id, class_id)` UNIQUE | Prevents double-enrollment; powers roster lookups |
| `students.enrollment_number`, `courses.code` | Searchable business keys |

---

## 6. Constraints, transactions & integrity

* **PK**: surrogate `BIGINT/INT` identity on every table (stable, join-friendly).
* **FK actions**: `CASCADE` for ownership (org → children, submission → mark),
  `RESTRICT` to protect academic history (can't delete a teacher who owns
  classes, or a role in use), `SET NULL` for soft references
  (`marked_by_teacher_id`, `generated_by_user_id`).
* **UNIQUE**: all natural/business keys (see tables above).
* **NOT NULL** + server-side `created_at/updated_at` defaults.
* **Transactions**: multi-statement writes are atomic — e.g.
  `organization_service.create` (organization + manager user + manager
  profile), `people_service.create_teacher` (user + teacher), and
  `attendance_service.mark_session` (whole-class upsert) each commit or roll
  back as a unit (`db.rollback()` on exception).

---

## 7. Migrations

`alembic/versions/0001_initial.py` is a baseline that builds the full schema
from the model metadata, so the first migration is guaranteed to match the
models. From there, normal autogenerate diffs apply:

```bash
alembic revision --autogenerate -m "describe change"
alembic upgrade head
```
