import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { departmentsApi } from '../services/api'

const INIT = { name: '', code: '' }

function AddDepartment() {
  const [form, setForm] = useState(INIT)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)
  const navigate = useNavigate()

  const handle = e => {
    const val = e.target.name === 'code' ? e.target.value.toUpperCase() : e.target.value
    setForm({ ...form, [e.target.name]: val })
  }

  const submit = async e => {
    e.preventDefault()
    setLoading(true)
    setMsg(null)

    const { error } = await departmentsApi.create(form)
    if (error) setMsg({ type: 'error', text: error })
    else {
      setMsg({ type: 'success', text: 'Department created successfully!' })
      setTimeout(() => navigate('/departments'), 1200)
    }
    setLoading(false)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Add New Department</div>
          <div className="page-desc">Create a new academic department</div>
        </div>
        <Link to="/departments" className="btn btn-outline">← Back to Departments</Link>
      </div>

      <div className="form-card">
        <form onSubmit={submit}>
          <div className="form-grid">
            <div className="form-group form-full">
              <label className="form-label">Department Name *</label>
              <input className="form-input" name="name" value={form.name}
                onChange={handle} placeholder="e.g. Computer Science" required />
            </div>
            <div className="form-group">
              <label className="form-label">Department Code *</label>
              <input className="form-input" name="code" value={form.code}
                onChange={handle} placeholder="e.g. CS" maxLength={20} required />
              <span className="form-hint">Short unique identifier, auto-uppercased</span>
            </div>
          </div>

          {msg && (
            <div className={`alert alert-${msg.type}`} style={{ marginTop: '1.25rem' }}>
              {msg.type === 'success' ? '✅' : '❌'} {msg.text}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating…' : '✓ Create Department'}
            </button>
            <button type="button" className="btn btn-outline" onClick={() => setForm(INIT)}>Reset</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddDepartment
