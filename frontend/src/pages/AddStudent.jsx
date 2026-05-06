import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { studentsApi } from '../services/api'

const INIT = { full_name: '', roll_number: '', email: '', semester: '', enrollment_date: '' }

function AddStudent() {
  const [form, setForm] = useState(INIT)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)
  const navigate = useNavigate()

  const handle = e => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async e => {
    e.preventDefault()
    setLoading(true)
    setMsg(null)

    const { data, error } = await studentsApi.create({
      ...form,
      semester: Number(form.semester),
    })

    if (error) {
      setMsg({ type: 'error', text: error })
    } else {
      setMsg({ type: 'success', text: 'Student added successfully!' })
      setTimeout(() => navigate('/students'), 1200)
    }
    setLoading(false)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Add New Student</div>
          <div className="page-desc">Fill in the details to register a student</div>
        </div>
        <Link to="/students" className="btn btn-outline">← Back to Students</Link>
      </div>

      <div className="form-card">
        <form onSubmit={submit}>
          <div className="form-grid">
            <div className="form-group form-full">
              <label className="form-label">Full Name *</label>
              <input className="form-input" name="full_name" value={form.full_name}
                onChange={handle} placeholder="e.g. Ahmed Khan" required />
            </div>
            <div className="form-group">
              <label className="form-label">Roll Number *</label>
              <input className="form-input" name="roll_number" value={form.roll_number}
                onChange={handle} placeholder="e.g. CS-2021-001" required />
              <span className="form-hint">Must be unique across all students</span>
            </div>
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input className="form-input" type="email" name="email" value={form.email}
                onChange={handle} placeholder="student@university.edu" required />
            </div>
            <div className="form-group">
              <label className="form-label">Semester *</label>
              <select className="form-select" name="semester" value={form.semester} onChange={handle} required>
                <option value="">Select semester</option>
                {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>Semester {n}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Enrollment Date *</label>
              <input className="form-input" type="date" name="enrollment_date"
                value={form.enrollment_date} onChange={handle} required />
            </div>
          </div>

          {msg && (
            <div className={`alert alert-${msg.type}`} style={{ marginTop: '1.25rem' }}>
              {msg.type === 'success' ? '✅' : '❌'} {msg.text}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving…' : '✓ Save Student'}
            </button>
            <button type="button" className="btn btn-outline" onClick={() => setForm(INIT)}>Reset</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddStudent
