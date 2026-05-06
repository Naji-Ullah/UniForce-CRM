import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { studentsApi } from '../services/api'

function EditStudent() {
  const { id } = useParams()
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    studentsApi.getOne(id).then(({ data, error }) => {
      if (error) setMsg({ type: 'error', text: error })
      else setForm(data)
      setLoading(false)
    })
  }, [id])

  const handle = e => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async e => {
    e.preventDefault()
    setSaving(true)
    setMsg(null)

    const { error } = await studentsApi.update(id, { ...form, semester: Number(form.semester) })
    if (error) setMsg({ type: 'error', text: error })
    else {
      setMsg({ type: 'success', text: 'Student updated successfully!' })
      setTimeout(() => navigate('/students'), 1200)
    }
    setSaving(false)
  }

  if (loading) return <div className="loading"><div className="spinner" /></div>
  if (!form)   return <div className="alert alert-error" style={{ margin: '2rem' }}>Student not found.</div>

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Edit Student</div>
          <div className="page-desc">Updating record for {form.full_name}</div>
        </div>
        <Link to="/students" className="btn btn-outline">← Back to Students</Link>
      </div>

      <div className="form-card">
        <form onSubmit={submit}>
          <div className="form-grid">
            <div className="form-group form-full">
              <label className="form-label">Full Name *</label>
              <input className="form-input" name="full_name" value={form.full_name ?? ''} onChange={handle} required />
            </div>
            <div className="form-group">
              <label className="form-label">Roll Number *</label>
              <input className="form-input" name="roll_number" value={form.roll_number ?? ''} onChange={handle} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input className="form-input" type="email" name="email" value={form.email ?? ''} onChange={handle} required />
            </div>
            <div className="form-group">
              <label className="form-label">Semester *</label>
              <select className="form-select" name="semester" value={form.semester ?? ''} onChange={handle} required>
                {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>Semester {n}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Enrollment Date *</label>
              <input className="form-input" type="date" name="enrollment_date" value={form.enrollment_date ?? ''} onChange={handle} required />
            </div>
          </div>

          {msg && (
            <div className={`alert alert-${msg.type}`} style={{ marginTop: '1.25rem' }}>
              {msg.type === 'success' ? '✅' : '❌'} {msg.text}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : '✓ Update Student'}
            </button>
            <Link to="/students" className="btn btn-outline">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditStudent
