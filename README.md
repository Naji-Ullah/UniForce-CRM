# UniForce — SaaS University CRM

A production-style, **multi-tenant** University CRM built database-first.
Multiple universities run on one platform with **completely isolated data**,
enforced at the schema, repository, and API layers.

> The architectural centerpiece is the **PostgreSQL relational design** — see
> [`docs/DATABASE.md`](docs/DATABASE.md) for the ERD, every relationship, the
> normalization rationale (to 3NF), the indexing strategy, and exactly how
> tenant isolation is guaranteed.

| Layer | Tech |
|-------|------|
| Frontend | Next.js 15 (App Router) · TypeScript · TailwindCSS · shadcn-style UI · Framer Motion · Recharts · Lucide |
| Backend | FastAPI · layered routers → services → repositories → Pydantic schemas |
| Database | PostgreSQL 16 · SQLAlchemy 2.0 ORM · Alembic migrations |
| Auth | JWT access + refresh tokens · bcrypt · role-based access control |
| Infra | Docker + Docker Compose · healthchecks · 12-factor config |

---

## Roles

| Role | Scope | Can do |
|------|-------|--------|
| **Head Admin** | Platform (no org) | Create/manage organizations, provision managers, view any tenant |
| **Manager** | One organization | Manage teachers, view org data |
| **Teacher** | One organization | Manage students, attendance, assignments, quizzes, marks, reports |

The Head Admin is seeded automatically on first startup.

---

## Quick start (Docker — recommended)

```bash
cp .env.example .env            # optional: tweak secrets
docker compose up --build
```

That single command starts **postgres + backend + frontend**, applies Alembic
migrations, and seeds two isolated demo universities.

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| API docs (Swagger) | http://localhost:8000/docs |
| Health | http://localhost:8000/health |

### Demo credentials

| Role | Email | Password |
|------|-------|----------|
| Head Admin | `admin@shizuka.io` | `Admin@12345` |
| Manager (Northfield) | `manager@northfield.edu` | `Manager@123` |
| Teacher (Northfield) | `teacher@northfield.edu` | `Teacher@123` |
| Manager (Riverside) | `manager@riverside.edu` | `Manager@123` |

Log in as the two managers to *see the tenant isolation*: neither can read the
other university's data.

---

## Manual / local development

**Backend**

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # set POSTGRES_HOST=localhost
alembic upgrade head            # create schema
python -m app.seed              # bootstrap + demo data
python run.py                   # http://localhost:8000
```

**Frontend**

```bash
cd frontend
npm install
cp .env.example .env            # BACKEND_URL=http://localhost:8000
npm run dev                     # http://localhost:3000
```

---

## Project structure

```
.
├── docker-compose.yml          # postgres + backend + frontend (+ healthchecks)
├── docs/DATABASE.md            # ERD, relationships, normalization, isolation
├── backend/
│   ├── alembic/                # migration env + baseline 0001_initial
│   ├── app/
│   │   ├── core/               # config, db, security, deps (RBAC+tenant), errors
│   │   ├── models/             # 16 SQLAlchemy models + mixins + enums
│   │   ├── schemas/            # Pydantic v2 request/response models
│   │   ├── repositories/       # tenant-scoped data access (isolation lives here)
│   │   ├── services/           # business logic + transactions
│   │   ├── routers/            # FastAPI endpoints
│   │   ├── utils/pdf.py        # ReportLab PDF builder
│   │   ├── seed.py             # idempotent bootstrap + demo seed
│   │   └── main.py             # app wiring, CORS, exception handler
│   └── Dockerfile
└── frontend/
    └── src/
        ├── app/                # App Router: login + (app) group pages
        ├── components/         # app shell, data table, UI primitives
        └── lib/                # API client (auto refresh), auth context
```

---

## API surface (prefix `/api/v1`)

| Group | Endpoints |
|-------|-----------|
| `auth` | `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me` |
| `organizations` | CRUD + `/stats` — **Head Admin only** |
| `teachers` | CRUD — Manager/Head Admin |
| `students` | CRUD — Teacher/Manager |
| `courses` `classes` `enrollments` | academic structure CRUD |
| `attendance` | `POST /attendance/mark` (bulk), `GET /attendance/summary` (aggregated %) |
| `assignments` | assignments, submissions, marks (1:1 grade) |
| `quizzes` | quizzes, bulk marks |
| `reports` | `GET /reports/{attendance|quiz|class-summary}/{class_id}` → branded PDF |
| `dashboard` | tenant aggregate counts |

Full interactive reference at `/docs`.

---

## Highlights for reviewers

- **Tenant isolation in depth** — schema discriminator + a repository base that
  *forces* the `organization_id` filter + an API dependency that pins the org
  from the token (a forged `?organization_id=` is ignored). See `docs/DATABASE.md §4`.
- **Real relational modeling** — 1:1, 1:N, M:N junction *with attributes*,
  composite unique natural keys, deliberate FK `CASCADE`/`RESTRICT`/`SET NULL`.
- **Transactions** — org+manager, user+teacher, and whole-class attendance are
  atomic with rollback.
- **Layered backend** — routers never touch the DB; services own transactions;
  repositories own tenant safety; services stay framework-free (custom domain
  errors mapped centrally).
- **Backend-generated PDFs** — branded, streamed, and audit-logged in `reports`.
- **Premium UI** — collapsible sidebar, dark mode, animated slide-overs,
  searchable tables, charts — no generic AI-dashboard look.
