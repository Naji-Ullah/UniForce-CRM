import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { enrollmentsApi, studentsApi, departmentsApi } from '../services/api'

const INIT = { student_id: '', department_id: '', status: 'active' }

function AddEnrollment() {
  const [form, setForm] = useState(INIT)
  const [students, setStudents] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([studentsApi.getAll(), departmentsApi.getAll()]).then(
      ([{ data: s }, { data: d }]) => {
        if (s) setStudents(s)
        if (d) setDepartments(d)
      }
    )
  }, [])

  const handle = e => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async e => {
    e.preventDefault()
    setLoading(true)
    setMsg(null)

    const { error } = await enrollmentsApi.create({
      ...form,
      student_id:    Number(form.student_id),
      department_id: Number(form.department_id),
    })

    if (error) setMsg({ type: 'error', text: error })
    else {
      setMsg({ type: 'success', text: 'Enrollment created successfully!' })
      setTimeout(() => navigate('/enrollments'), 1200)
    }
    setLoading(false)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Add Enrollment</div>
          <div className="page-desc">Enroll a student in a department</div>
        </div>
        <Link to="/enrollments" className="btn btn-outline">← Back to Enrollments</Link>
      </div>

      <div className="form-card">
        <form onSubmit={submit}>
          <div className="form-grid">
            <div className="form-group form-full">
              <label className="form-label">Student *</label>
              <select className="form-select" name="student_id" value={form.student_id} onChange={handle} required>
                <option value="">Select a student</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.full_name} — {s.roll_number}</option>
                ))}
              </select>
              {students.length === 0 && <span className="form-hint">⚠️ No students yet. <Link to="/add-student">Add one first.</Link></span>}
            </div>
            <div className="form-group form-full">
              <label className="form-label">Department *</label>
              <select className="form-select" name="department_id" value={form.department_id} onChange={handle} required>
                <option value="">Select a department</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                ))}
              </select>
              {departments.length === 0 && <span className="form-hint">⚠️ No departments yet. <Link to="/add-department">Add one first.</Link></span>}
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" name="status" value={form.status} onChange={handle}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          {msg && (
            <div className={`alert alert-${msg.type}`} style={{ marginTop: '1.25rem' }}>
              {msg.type === 'success' ? '✅' : '❌'} {msg.text}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Enrolling…' : '✓ Create Enrollment'}
            </button>
            <button type="button" className="btn btn-outline" onClick={() => setForm(INIT)}>Reset</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddEnrollment
