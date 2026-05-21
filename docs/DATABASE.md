# The Shizuka-CRM Database — Detailed Walkthrough

## The 30-second mental model

This is a **multi-tenant university CRM**. One Postgres database serves many universities. Every "tenant-scoped" row carries an `organization_id` so one university's data can never bleed into another's. Inside a tenant, the data flows from **Organization → People → Courses & Classes → Assessment → Reports**.

There are **17 tables** total, all living in the default `public` schema.

> Stack: **PostgreSQL 16** · **SQLAlchemy 2.0** (declarative `Mapped[]`) · **Alembic** migrations. Models live in `backend/app/models/`.

---

## 1. The tenant root

### 🏛️ `organizations`
The university itself. Everything else hangs off this.

| Column | What it is |
|---|---|
| `id` | PK |
| `slug` | URL-safe key (e.g. `cuilahore`). Globally unique. |
| `name` | Full name (e.g. "CUI Lahore") |
| `domain` | Optional email domain |
| `plan` | Billing plan name (default `"standard"`) |
| `is_active` | Suspend a whole tenant without deleting it |

> **Cascade rule:** delete an organization → every row in every tenant table that references it disappears (Postgres `ON DELETE CASCADE`). One atomic "delete the whole university."

---

## 2. Identity & access — *who can log in*

### 🔑 `roles` (lookup table — only 4 rows ever)
A tiny dictionary so role metadata lives in one place. Values: `HEAD_ADMIN`, `MANAGER`, `TEACHER`, `STUDENT`.

### 👤 `users`
The login table. Every person who can sign in has a row here.

- `email` — unique across the **entire platform** (auth happens before we know which tenant you belong to).
- `organization_id` — which university you belong to. **Nullable on purpose:** the Head Admin owns no single tenant, so they get `NULL`.
- `role_id` → `roles`. `ON DELETE RESTRICT` — you can't delete a role that's still in use.
- `hashed_password`, `is_active`, `last_login_at` — usual auth metadata.

### 🧑‍💼 `managers` (1-to-1 with `users`)
A user who is a Manager gets one extra row here with their `title` and `phone`. `user_id` is `UNIQUE` — that's how Postgres enforces "one user, at most one manager profile."

### 🧑‍🏫 `teachers` (1-to-1 with `users`)
Faculty extension. Extra fields: `employee_code`, `department_id`, `phone`, `hire_date`.

- `UNIQUE (organization_id, employee_code)` — employee codes are unique **within** a tenant. Two universities can both have an `FAC-CS-01`; that's fine.
- `department_id` is `ON DELETE SET NULL` — deleting a department doesn't kill its teachers, just unlinks them.

### 🧑‍🎓 `students` (optional 1-to-1 with `users`)
The interesting one. `user_id` is **nullable** — a student can exist without a login (e.g. legacy imports). When set, that user is how the student signs in.

- `UNIQUE (organization_id, enrollment_number)` — e.g. `FA26-BCS-001` is unique within CUI Lahore but could repeat at another uni.
- `UNIQUE (organization_id, email)` — same logic for email.
- `status` — `ACTIVE / INACTIVE / GRADUATED / SUSPENDED`.

---

## 3. Academic structure — *what is taught*

### 🏢 `departments`
"Computer Science", "Electrical Engineering", etc. — owned by an organization.

- `UNIQUE (organization_id, code)` and `UNIQUE (organization_id, name)`.

### 📚 `courses`
The **course catalog**. A course is an abstract idea: "CSC-101 — Intro to Programming, 3 credit hours". It is *not* tied to a teacher or a semester.

- `UNIQUE (organization_id, code)`.

### 🎓 `classes`
A **class is one offering of a course** — a specific section in a specific term, taught by a specific teacher.

This split (course = catalog, class = offering) is the most important modeling decision in the schema. It means CSC-101 can run every semester with different teachers without duplicating the catalog row.

- `course_id` → `courses` (`CASCADE`)
- `teacher_id` → `teachers` (`RESTRICT` — you can't delete a teacher who's still teaching something)
- `section`, `term`, `room`, `schedule`, `capacity`
- `UNIQUE (organization_id, course_id, term, section)` — no two identical sections of the same course in the same term.

### 🔗 `enrollments` (the M:N junction between students and classes)
A student can take many classes; a class has many students. This table resolves that.

- `UNIQUE (student_id, class_id)` — a student is either in a class or not, no duplicates.
- Carries its own data: `status` (`ENROLLED / DROPPED / COMPLETED`), `final_grade`, `enrolled_at`. That makes it an **association object**, not a bare link table.

---

## 4. Assessment — *what is recorded*

### ✅ `attendance`
One row per **(class, student, session date)**. The hot query is "today's attendance sheet for this class" — there's a composite unique on those three columns.

- `marked_by_teacher_id` is `SET NULL` (deleting a teacher doesn't destroy history).
- `status`: `PRESENT / ABSENT / LATE / EXCUSED`.

### 📝 `assignments` → `assignment_submissions` → `assignment_marks`
A three-step pipeline:

1. **`assignments`** — a teacher creates one ("Lab 3 — Recursion, due Friday, /100"). Belongs to a `class_id`.
2. **`assignment_submissions`** — what the student turned in. `UNIQUE (assignment_id, student_id)` — one submission per student per assignment.
3. **`assignment_marks`** — the grade. **1-to-1 with submission** (the `submission_id` FK is `UNIQUE`). Separating the mark from the submission cleanly splits "the act of turning in" from "the act of grading" — including who graded it and when.

### 📊 `quizzes` → `quiz_marks`
Simpler than assignments — no separate submission step.

- `quizzes` belongs to a `class_id`, has `total_marks` (default 20) and `quiz_date`.
- `quiz_marks` — `UNIQUE (quiz_id, student_id)`. Direct mark, no intermediate submission object.

---

## 5. Audit — *who downloaded what*

### 📄 `reports`
Every PDF a manager or teacher generates gets logged.

- `report_type` (e.g. `attendance`, `gradebook`), `scope` (`class` | `student`), `reference_id` (the class or student id), `file_name`.
- `params` is **JSONB** — stores the exact filter set used so a report is reproducible without needing extra columns.

---

## Visual map of everything

```
                  ┌────────────────────┐
                  │  organizations     │  (tenant root — everything below is org-scoped)
                  └─────────┬──────────┘
                            │ 1
        ┌───────────────────┼───────────────────────────┐
        │                   │                           │
       ▼ N                  ▼ N                         ▼ N
   ┌────────┐         ┌─────────────┐             ┌──────────┐
   │ users  │         │ departments │             │ students │
   └───┬────┘         └──────┬──────┘             └────┬─────┘
       │ 1:1                 │ 1                       │
   ┌───┴────┬────────┐       │ N                       │
   ▼        ▼        ▼      ▼                          │
managers teachers (student_  ┌──────────┐              │
              user link)     │ courses  │              │
                 │           └────┬─────┘              │
                 │                │ 1                  │
                 │                ▼ N                  │
                 │           ┌──────────┐              │
                 └──────────►│ classes  │◄─────────────┘
                  N (teaches)└────┬─────┘  M:N via `enrollments`
                                  │ 1
              ┌───────────────────┼────────────────────┐
              ▼ N                 ▼ N                  ▼ N
       ┌──────────────┐   ┌─────────────┐      ┌────────────┐
       │ attendance   │   │ assignments │      │  quizzes   │
       └──────────────┘   └──────┬──────┘      └─────┬──────┘
                                 │ 1                 │ 1
                                 ▼ N                 ▼ N
                       ┌──────────────────┐   ┌────────────┐
                       │ assignment_      │   │ quiz_marks │
                       │   submissions    │   └────────────┘
                       └────────┬─────────┘
                                │ 1:1
                                ▼
                     ┌─────────────────────┐
                     │ assignment_marks    │
                     └─────────────────────┘

                  ┌──────────┐
                  │ reports  │  ← audit log of generated PDFs
                  └──────────┘
```

---

## Cross-cutting design notes

These are the conventions that show up everywhere, worth knowing once:

- **`TimestampMixin`** — every meaningful table has `created_at` and `updated_at`. Free audit timeline.
- **`TenantMixin`** — adds `organization_id` + index + cascade. Almost every non-`organizations` table inherits it.
- **Cardinality is enforced at the DB, not just code:**
  - **1-to-1** via a `UNIQUE` foreign key (e.g. `managers.user_id UNIQUE`, `assignment_marks.submission_id UNIQUE`).
  - **M-to-N** via a junction table with a composite `UNIQUE` (e.g. `enrollments(student_id, class_id)`).
  - **Natural-key uniqueness** within a tenant via composite `UNIQUE (organization_id, …)`.
- **`ON DELETE` rules tell a story:**
  - `CASCADE` — owning-relationship: deleting the parent should wipe its children (organization → users; class → enrollments).
  - `RESTRICT` — protect history: can't delete a teacher who's still teaching, can't delete a role still in use.
  - `SET NULL` — soft attribution: keep the record but null the attribution (who graded this submission, who marked this attendance).
- **Roles as a table, not just an enum** — keeps role metadata in one place (textbook 3NF). The enum exists for code-side type safety; the table is the source of truth.
- **Students aren't required to be users** — `students.user_id` is optional. Lets you import student records without logins (e.g. legacy demo data).
- **No PostgreSQL "schemas" beyond `public`** — multi-tenancy is row-level (`organization_id` filter), not schema-per-tenant. Simpler ops, one set of migrations, isolation enforced in the service layer (`backend/app/core/deps.py` — the `TenantContext`).

---

## What to explore first in DBeaver

Once you're connected on port **5433**, expand `shizuka_crm → Schemas → public → Tables`. Good first queries to run:

```sql
-- 1. See the four roles
SELECT * FROM roles;

-- 2. See all tenants
SELECT id, slug, name, plan, is_active FROM organizations;

-- 3. Pakistani-name seed: CUI Lahore teachers and their departments
SELECT u.full_name, t.employee_code, d.code AS dept
FROM teachers t
JOIN users u       ON u.id = t.user_id
JOIN departments d ON d.id = t.department_id
WHERE t.organization_id = (SELECT id FROM organizations WHERE slug='cuilahore');

-- 4. The attendance grid for one class
SELECT s.enrollment_number, s.full_name, a.session_date, a.status
FROM attendance a
JOIN students s ON s.id = a.student_id
WHERE a.class_id = 1
ORDER BY s.enrollment_number, a.session_date;
```

DBeaver also has a built-in ER diagram: right-click any table or the `public` schema → **View Diagram** — it auto-draws the boxes-and-arrows version of the map above.
