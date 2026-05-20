# Shizuka-CRM — Demo Credentials

All seeded accounts. Frontend at `http://localhost:3000`, backend at `http://localhost:8000`.

> ⚠️ These are seed/demo passwords. Rotate before any non-dev use.

## Platform

| Role | Email | Password |
|---|---|---|
| Head Admin | `admin@shizuka.io` | `Admin@12345` |

## CUI Lahore (slug: `cuilahore`) — Pakistani-name seed

### Manager
| Role | Email | Password |
|---|---|---|
| Manager (Registrar) | `manager@cuilahore.edu.pk` | `Password1234!` |

### Teachers (10) — pattern: `{first}.{last}.{emp_code}@cuilahore.edu.pk`, pw `Password1234!`

| Employee code | Department | Name | Email |
|---|---|---|---|
| FAC-CS-01 | Computer Science | Hamza Iqbal | `hamza.iqbal.fac-cs-01@cuilahore.edu.pk` |
| FAC-CS-02 | Computer Science | Mehwish Rashid | `mehwish.rashid.fac-cs-02@cuilahore.edu.pk` |
| FAC-CS-03 | Computer Science | Talha Mehmood | `talha.mehmood.fac-cs-03@cuilahore.edu.pk` |
| FAC-EE-01 | Electrical Engineering | Saad Hussain | `saad.hussain.fac-ee-01@cuilahore.edu.pk` |
| FAC-EE-02 | Electrical Engineering | Anum Akhtar | `anum.akhtar.fac-ee-02@cuilahore.edu.pk` |
| FAC-MGT-01 | Management Sciences | Sadia Saleem | `sadia.saleem.fac-mgt-01@cuilahore.edu.pk` |
| FAC-MGT-02 | Management Sciences | Awais Aslam | `awais.aslam.fac-mgt-02@cuilahore.edu.pk` |
| FAC-MAT-01 | Mathematics | Umar Ashraf | `umar.ashraf.fac-mat-01@cuilahore.edu.pk` |
| FAC-PHY-01 | Physics | Hina Javed | `hina.javed.fac-phy-01@cuilahore.edu.pk` |
| FAC-PHY-02 | Physics | Imran Farooq | `imran.farooq.fac-phy-02@cuilahore.edu.pk` |

### Students (60) — pw `Password1234!`

Emails follow the pattern `fa26bcs{NNN}@cuilahore.edu.pk` where `NNN` is the 3-digit student number from `001` to `060`.

| Enrollment number | Email |
|---|---|
| FA26-BCS-001 | `fa26bcs001@cuilahore.edu.pk` |
| FA26-BCS-002 | `fa26bcs002@cuilahore.edu.pk` |
| … | … |
| FA26-BCS-060 | `fa26bcs060@cuilahore.edu.pk` |

Roughly 1 in 9 students is seeded as a low-attendance case (below 80%) so the "Needs improvement (<80%)" report filter has something to show. The rest are in the 85–100% range.

### Seeded academic content (CUI Lahore)

| Item | Count | Notes |
|---|---|---|
| Departments | 5 | CS, EE, MGT, MAT, PHY |
| Courses | 10 | e.g. CSC-101, EEE-121, MGT-101, MTH-104, PHY-105 |
| Classes | 10 | One section per course, term Spring 2026 |
| Enrollments | 240 | Every student enrolls in 4 classes |
| Attendance | 4 weeks × 2 sessions × 24 students per class | Mix of present / absent / late |
| Assignments | 20 (2 per class) | Fully graded — every enrolled student has a marked submission |
| Quizzes | 30 (3 per class) | Total marks 20, scores 10–20 |

## Northfield University (slug: `northfield`) — legacy demo

| Role | Email | Password |
|---|---|---|
| Manager | `manager@northfield.edu` | `Manager@123` |
| Teacher | `teacher@northfield.edu` | `Teacher@123` |

Students 1–5 (`NORTHFIELD-2026-001`…`005`) — no logins (legacy demo data).

## Riverside Institute of Technology (slug: `riverside`) — legacy demo

| Role | Email | Password |
|---|---|---|
| Manager | `manager@riverside.edu` | `Manager@123` |
| Teacher | `teacher@riverside.edu` | `Teacher@123` |

Students 1–5 (`RIVERSIDE-2026-001`…`005`) — no logins (legacy demo data).

## Infrastructure (from `docker-compose.yml`)

| Service | Setting | Default |
|---|---|---|
| Postgres | `POSTGRES_USER` | `shizuka` |
| Postgres | `POSTGRES_PASSWORD` | `shizuka` |
| Postgres | `POSTGRES_DB` | `shizuka_crm` |
| Backend | `JWT_SECRET_KEY` | `super-secret-change-me` |

Override any of these via a local `.env` (see `.env.example`).

## How to re-seed

The seed is idempotent. From the backend container:

```bash
docker exec shizuka-crm-backend-1 python -m app.seed
```

To wipe and re-seed from scratch:

```bash
docker compose down -v   # drops the pgdata volume
docker compose up -d backend
```
