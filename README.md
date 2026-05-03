# Shizuka CRM System

A clean, no-nonsense CRM for universities to manage students, faculty, departments, and enrollments. Built with Flask + PostgreSQL because sometimes you just need something that works without the JavaScript fatigue.

## What's Inside

**Backend (Flask + SQLAlchemy)**
- RESTful API with all the CRUD operations you actually need
- 5 tables: students, faculty, departments, enrollments, users
- Password hashing (because plain text passwords are a crime)
- Application Factory pattern (fancy, but actually useful)
- Blueprints for organized routes (no spaghetti code)
- Database migrations via Flask-Migrate

**Frontend (You'll build this)**
- React + Vite (ahmed will make it hope so)
- React Router for navigation
- Clean, simple CSS (no Bootstrap shit)
- Pages you'll need: Dashboard, Students list, Add Student, Faculty list, Add Faculty

## Getting Started

### 1. Database Setup
```bash
# Create PostgreSQL database
createdb university_crm
```

### 2. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Setup environment
cp .env.example .env
# Edit .env with your database credentials
# DATABASE_URL=postgresql://username:password@localhost:5432/university_crm
# SECRET_KEY=your-secret-key-here

# Initialize database
flask db init
flask db migrate -m "initial"
flask db upgrade

# Run backend
python run.py
```
Backend will run on `http://localhost:5000`

### 3. Frontend Setup (When you're ready)
```bash
cd frontend

# Install dependencies
npm install

# Run dev server
npm run dev
```
Frontend will run on `http://localhost:8080`

## API Endpoints

### Dashboard
- `GET /api/dashboard/stats` - Get all the fancy numbers for the dashboard

### Students
- `GET /api/students` - List all students
- `GET /api/students/:id` - Get specific student
- `POST /api/students` - Add new student
- `PUT /api/students/:id` - Update student
- `DELETE /api/students/:id` - Delete student

### Faculty
- `GET /api/faculty` - List all faculty
- `GET /api/faculty/:id` - Get specific faculty
- `POST /api/faculty` - Add new faculty
- `PUT /api/faculty/:id` - Update faculty
- `DELETE /api/faculty/:id` - Delete faculty

### Departments
- `GET /api/departments` - List all departments
- `GET /api/departments/:id` - Get specific department
- `POST /api/departments` - Add new department
- `PUT /api/departments/:id` - Update department
- `DELETE /api/departments/:id` - Delete department

### Enrollments
- `GET /api/enrollments` - List all enrollments
- `GET /api/enrollments/:id` - Get specific enrollment
- `POST /api/enrollments` - Create enrollment
- `PUT /api/enrollments/:id` - Update enrollment
- `DELETE /api/enrollments/:id` - Delete enrollment
- `GET /api/students/:student_id/enrollments` - Get student's enrollments

### Users
- `GET /api/users` - List all users
- `GET /api/users/:id` - Get specific user
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `POST /api/login` - Login (returns user data if credentials match)

## Database Schema

**students** - id, full_name, roll_number, email, semester, enrollment_date
**faculty** - id, full_name, email, designation, department_id
**departments** - id, name, code
**enrollments** - id, student_id, department_id, status (active/inactive), enrolled_at
**users** - id, username, password_hash, role (admin/staff)

## Tech Stack

**Backend:**
- Flask (the Python web framework that doesn't hate you)
- SQLAlchemy (ORM that makes SQL bearable)
- Flask-Migrate (database migrations without the pain)
- PostgreSQL (real database for real data)
- python-dotenv (environment variables like a pro)

**Frontend (To be built):**
- React (the library everyone uses)
- Vite (fast build tool, faster than whatever you used before)
- React Router (SPA navigation without the headache)

## Notes

- Backend is CORS-enabled for cross-origin requests
- Passwords are hashed using werkzeug.security (never trust plain text)
- No half-finished functions, no placeholders, no "TODO" comments
- Clean, simple code that does what it says

## Contributing

It's your project, do whatever you want. But please don't break the backend API contract.

## License

MIT - because licenses are boring and this is for learning/usage anyway.

---

Built with love and too much caffeine. No frameworks were harmed in the making of the backend (HOPE SO)
