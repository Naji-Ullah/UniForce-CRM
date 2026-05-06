import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { facultyApi, departmentsApi } from '../services/api'

const INIT = { full_name: '', email: '', designation: '', department_id: '' }
const DESIGNATIONS = ['Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer', 'Lab Instructor', 'Senior Lecturer']

function AddFaculty() {
  const [form, setForm] = useState(INIT)
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    departmentsApi.getAll().then(({ data }) => { if (data) setDepartments(data) })
  }, [])

  const handle = e => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async e => {
    e.preventDefault()
    setLoading(true)
    setMsg(null)

    const { error } = await facultyApi.create({ ...form, department_id: Number(form.department_id) })
    if (error) setMsg({ type: 'error', text: error })
    else {
      setMsg({ type: 'success', text: 'Faculty member added successfully!' })
      setTimeout(() => navigate('/faculty'), 1200)
    }
    setLoading(false)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Add New Faculty</div>
          <div className="page-desc">Register a new faculty member</div>
        </div>
        <Link to="/faculty" className="btn btn-outline">← Back to Faculty</Link>
      </div>

      <div className="form-card">
        <form onSubmit={submit}>
          <div className="form-grid">
            <div className="form-group form-full">
              <label className="form-label">Full Name *</label>
              <input className="form-input" name="full_name" value={form.full_name}
                onChange={handle} placeholder="e.g. Dr. Sarah Ahmed" required />
            </div>
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input className="form-input" type="email" name="email" value={form.email}
                onChange={handle} placeholder="faculty@university.edu" required />
            </div>
            <div className="form-group">
              <label className="form-label">Designation *</label>
              <select className="form-select" name="designation" value={form.designation} onChange={handle} required>
                <option value="">Select designation</option>
                {DESIGNATIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="form-group form-full">
              <label className="form-label">Department *</label>
              <select className="form-select" name="department_id" value={form.department_id} onChange={handle} required>
                <option value="">Select department</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
              </select>
              {departments.length === 0 && (
                <span className="form-hint">⚠️ No departments yet. <Link to="/add-department">Add one first.</Link></span>
              )}
            </div>
          </div>

          {msg && (
            <div className={`alert alert-${msg.type}`} style={{ marginTop: '1.25rem' }}>
              {msg.type === 'success' ? '✅' : '❌'} {msg.text}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving…' : '✓ Save Faculty'}
            </button>
            <button type="button" className="btn btn-outline" onClick={() => setForm(INIT)}>Reset</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddFaculty
