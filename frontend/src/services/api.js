/**
 * api.js — Centralized API service layer for Shizuka UniCRM
 *
 * Base URL:  http://localhost:5000/api
 *
 * All functions return { data, error } objects.
 *  - On success: { data: <response body>, error: null }
 *  - On failure: { data: null,            error: <string message> }
 *
 * This prevents raw fetch() calls from being scattered across pages
 * and gives one single place to swap the base URL or add auth headers.
 */

const BASE_URL = 'http://localhost:5000/api'

// ─── Core request helper ──────────────────────────────────────────────────────
async function request(path, options = {}) {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    })
    const text = await res.text()
    const data = text ? JSON.parse(text) : {}

    if (!res.ok) {
      return { data: null, error: data.error ?? `Request failed (${res.status})` }
    }
    return { data, error: null }
  } catch (err) {
    return { data: null, error: 'Network error — is the backend running?' }
  }
}

const get    = (path)         => request(path)
const post   = (path, body)   => request(path, { method: 'POST',   body: JSON.stringify(body) })
const put    = (path, body)   => request(path, { method: 'PUT',    body: JSON.stringify(body) })
const del    = (path)         => request(path, { method: 'DELETE' })

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const dashboardApi = {
  /** GET /dashboard/stats → { counts, recent_students, recent_faculty } */
  getStats: () => get('/dashboard/stats'),
}

// ─── Students ─────────────────────────────────────────────────────────────────
export const studentsApi = {
  /** GET  /students              → Student[]         */
  getAll:  ()           => get('/students'),

  /** GET  /students/:id          → Student           */
  getOne:  (id)         => get(`/students/${id}`),

  /**
   * POST /students
   * Body: { full_name, roll_number, email, semester, enrollment_date (YYYY-MM-DD) }
   */
  create:  (body)       => post('/students', body),

  /**
   * PUT /students/:id
   * Body: partial Student fields
   */
  update:  (id, body)   => put(`/students/${id}`, body),

  /** DELETE /students/:id        → { message } */
  remove:  (id)         => del(`/students/${id}`),

  /** GET  /students/:id/enrollments → Enrollment[]  */
  getEnrollments: (id)  => get(`/students/${id}/enrollments`),
}

// ─── Faculty ──────────────────────────────────────────────────────────────────
export const facultyApi = {
  /** GET  /faculty               → Faculty[]         */
  getAll:  ()           => get('/faculty'),

  /** GET  /faculty/:id           → Faculty           */
  getOne:  (id)         => get(`/faculty/${id}`),

  /**
   * POST /faculty
   * Body: { full_name, email, designation, department_id }
   */
  create:  (body)       => post('/faculty', body),

  /**
   * PUT /faculty/:id
   * Body: partial Faculty fields
   */
  update:  (id, body)   => put(`/faculty/${id}`, body),

  /** DELETE /faculty/:id         → { message }       */
  remove:  (id)         => del(`/faculty/${id}`),
}

// ─── Departments ──────────────────────────────────────────────────────────────
export const departmentsApi = {
  /** GET  /departments           → Department[]      */
  getAll:  ()           => get('/departments'),

  /** GET  /departments/:id       → Department        */
  getOne:  (id)         => get(`/departments/${id}`),

  /**
   * POST /departments
   * Body: { name, code }
   */
  create:  (body)       => post('/departments', body),

  /**
   * PUT /departments/:id
   * Body: { name?, code? }
   */
  update:  (id, body)   => put(`/departments/${id}`, body),

  /** DELETE /departments/:id     → { message }       */
  remove:  (id)         => del(`/departments/${id}`),
}

// ─── Enrollments ──────────────────────────────────────────────────────────────
export const enrollmentsApi = {
  /** GET  /enrollments           → Enrollment[]      */
  getAll:  ()           => get('/enrollments'),

  /** GET  /enrollments/:id       → Enrollment        */
  getOne:  (id)         => get(`/enrollments/${id}`),

  /**
   * POST /enrollments
   * Body: { student_id, department_id, status? ('active'|'inactive'|'completed') }
   */
  create:  (body)       => post('/enrollments', body),

  /**
   * PUT /enrollments/:id
   * Body: { status?, department_id? }
   * Note: status must be 'active' or 'inactive' per backend validation
   */
  update:  (id, body)   => put(`/enrollments/${id}`, body),

  /** DELETE /enrollments/:id     → { message }       */
  remove:  (id)         => del(`/enrollments/${id}`),
}

// ─── Users ────────────────────────────────────────────────────────────────────
export const usersApi = {
  /** GET  /users                 → User[]            */
  getAll:  ()           => get('/users'),

  /** GET  /users/:id             → User              */
  getOne:  (id)         => get(`/users/${id}`),

  /**
   * POST /users
   * Body: { username, password, role? ('admin'|'staff') }
   */
  create:  (body)       => post('/users', body),

  /**
   * PUT /users/:id
   * Body: { username?, password?, role? }
   */
  update:  (id, body)   => put(`/users/${id}`, body),

  /** DELETE /users/:id           → { message }       */
  remove:  (id)         => del(`/users/${id}`),

  /**
   * POST /login
   * Body: { username, password }
   * Returns: { message, user } or { error }
   */
  login:   (body)       => post('/login', body),
}
