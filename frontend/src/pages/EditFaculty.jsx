import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { facultyApi, departmentsApi } from '../services/api'

const DESIGNATIONS = ['Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer', 'Lab Instructor', 'Senior Lecturer']

function EditFaculty() {
  const { id } = useParams()
  const [form, setForm] = useState(null)
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([
      facultyApi.getOne(id),
      departmentsApi.getAll(),
    ]).then(([{ data: faculty, error: fErr }, { data: depts }]) => {
      if (fErr) setMsg({ type: 'error', text: fErr })
      else setForm(faculty)
      if (depts) setDepartments(depts)
      setLoading(false)
    })
  }, [id])

  const handle = e => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async e => {
    e.preventDefault()
    setSaving(true)
    setMsg(null)

    const { error } = await facultyApi.update(id, { ...form, department_id: Number(form.department_id) })
    if (error) setMsg({ type: 'error', text: error })
    else {
      setMsg({ type: 'success', text: 'Faculty updated!' })
      setTimeout(() => navigate('/faculty'), 1200)
    }
    setSaving(false)
  }

  if (loading) return <div className="loading"><div className="spinner" /></div>
  if (!form)   return <div className="alert alert-error" style={{ margin: '2rem' }}>Faculty not found.</div>

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Edit Faculty</div>
          <div className="page-desc">Updating record for {form.full_name}</div>
        </div>
        <Link to="/faculty" className="btn btn-outline">← Back to Faculty</Link>
      </div>

      <div className="form-card">
        <form onSubmit={submit}>
          <div className="form-grid">
            <div className="form-group form-full">
              <label className="form-label">Full Name *</label>
              <input className="form-input" name="full_name" value={form.full_name ?? ''} onChange={handle} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input className="form-input" type="email" name="email" value={form.email ?? ''} onChange={handle} required />
            </div>
            <div className="form-group">
              <label className="form-label">Designation *</label>
              <select className="form-select" name="designation" value={form.designation ?? ''} onChange={handle} required>
                {DESIGNATIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="form-group form-full">
              <label className="form-label">Department *</label>
              <select className="form-select" name="department_id" value={form.department_id ?? ''} onChange={handle} required>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
              </select>
            </div>
          </div>

          {msg && (
            <div className={`alert alert-${msg.type}`} style={{ marginTop: '1.25rem' }}>
              {msg.type === 'success' ? '✅' : '❌'} {msg.text}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : '✓ Update Faculty'}
            </button>
            <Link to="/faculty" className="btn btn-outline">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditFaculty
