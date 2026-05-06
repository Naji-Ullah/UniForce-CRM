import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { studentsApi } from '../services/api'

function ConfirmModal({ onConfirm, onCancel, name }) {
  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-title">Delete Student</div>
        <div className="modal-desc">
          Are you sure you want to delete <strong>{name}</strong>?
          This cannot be undone and will also remove all their enrollments.
        </div>
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  )
}

function Students() {
  const [students, setStudents] = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState('')
  const [semFilter, setSemFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [msg, setMsg] = useState(null)
  const navigate = useNavigate()

  const fetchStudents = async () => {
    setLoading(true)
    const { data, error } = await studentsApi.getAll()
    if (error) setMsg({ type: 'error', text: error })
    else { setStudents(data); setFiltered(data) }
    setLoading(false)
  }

  useEffect(() => { fetchStudents() }, [])

  useEffect(() => {
    let data = students
    if (search) {
      const q = search.toLowerCase()
      data = data.filter(s =>
        s.full_name.toLowerCase().includes(q) ||
        s.roll_number.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q)
      )
    }
    if (semFilter) data = data.filter(s => String(s.semester) === semFilter)
    setFiltered(data)
  }, [search, semFilter, students])

  const handleDelete = async () => {
    const { error } = await studentsApi.remove(deleteTarget.id)
    if (error) setMsg({ type: 'error', text: error })
    else {
      setMsg({ type: 'success', text: `${deleteTarget.full_name} deleted successfully.` })
      fetchStudents()
    }
    setDeleteTarget(null)
  }

  const initials = name => name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '?'
  const avatarCls = i => ['avatar-teal', 'avatar-amber', 'avatar-blue'][i % 3]
  const semesters = [...new Set(students.map(s => s.semester))].sort((a, b) => a - b)

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Students</div>
          <div className="page-desc">{students.length} total students registered</div>
        </div>
        <Link to="/add-student" className="btn btn-primary">+ Add Student</Link>
      </div>

      {msg && (
        <div className={`alert alert-${msg.type}`} style={{ marginBottom: '1rem' }}>
          {msg.type === 'success' ? '✅' : '❌'} {msg.text}
          <button onClick={() => setMsg(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>×</button>
        </div>
      )}

      <div className="toolbar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input type="text" placeholder="Search by name, roll number or email…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="filter-select" value={semFilter} onChange={e => setSemFilter(e.target.value)}>
          <option value="">All Semesters</option>
          {semesters.map(s => <option key={s} value={s}>Semester {s}</option>)}
        </select>
        <span className="badge badge-neutral">{filtered.length} shown</span>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="table-container">
          <div className="empty-state">
            <div className="empty-state-icon">🎓</div>
            <h3>No students found</h3>
            <p>Try changing your search or add a new student.</p>
          </div>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Roll No.</th>
                <th>Email</th>
                <th>Semester</th>
                <th>Enrolled On</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr key={s.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div className={`avatar ${avatarCls(i)}`}>{initials(s.full_name)}</div>
                      <span style={{ fontWeight: 500 }}>{s.full_name}</span>
                    </div>
                  </td>
                  <td><code style={{ background: 'var(--surface-2)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem' }}>{s.roll_number}</code></td>
                  <td style={{ color: 'var(--text-secondary)' }}>{s.email}</td>
                  <td><span className="badge badge-info">Sem {s.semester}</span></td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{s.enrollment_date ?? '—'}</td>
                  <td>
                    <div className="action-cell">
                      <button className="btn btn-outline btn-sm" onClick={() => navigate(`/edit-student/${s.id}`)}>✏️ Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(s)}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal name={deleteTarget.full_name} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
      )}
    </div>
  )
}

export default Students
