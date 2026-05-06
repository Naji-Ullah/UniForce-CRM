import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { facultyApi } from '../services/api'

function Faculty() {
  const [faculty, setFaculty] = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [msg, setMsg] = useState(null)
  const navigate = useNavigate()

  const fetchFaculty = async () => {
    setLoading(true)
    const { data, error } = await facultyApi.getAll()
    if (error) setMsg({ type: 'error', text: error })
    else { setFaculty(data); setFiltered(data) }
    setLoading(false)
  }

  useEffect(() => { fetchFaculty() }, [])

  useEffect(() => {
    let data = faculty
    if (search) {
      const q = search.toLowerCase()
      data = data.filter(f =>
        f.full_name.toLowerCase().includes(q) ||
        f.email.toLowerCase().includes(q) ||
        f.designation.toLowerCase().includes(q)
      )
    }
    if (deptFilter) data = data.filter(f => String(f.department_id) === deptFilter)
    setFiltered(data)
  }, [search, deptFilter, faculty])

  const handleDelete = async () => {
    const { error } = await facultyApi.remove(deleteTarget.id)
    if (error) setMsg({ type: 'error', text: error })
    else {
      setMsg({ type: 'success', text: `${deleteTarget.full_name} removed.` })
      fetchFaculty()
    }
    setDeleteTarget(null)
  }

  const departments = [...new Map(faculty.map(f => [f.department_id, f.department])).entries()].filter(([, d]) => d)
  const initials = name => name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '?'
  const avatarCls = i => ['avatar-amber', 'avatar-teal', 'avatar-blue'][i % 3]

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Faculty</div>
          <div className="page-desc">{faculty.length} faculty members registered</div>
        </div>
        <Link to="/add-faculty" className="btn btn-primary">+ Add Faculty</Link>
      </div>

      {msg && (
        <div className={`alert alert-${msg.type}`} style={{ marginBottom: '1rem' }}>
          {msg.type === 'success' ? '✅' : '❌'} {msg.text}
          <button onClick={() => setMsg(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
        </div>
      )}

      <div className="toolbar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input type="text" placeholder="Search by name, email, designation…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="filter-select" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
          <option value="">All Departments</option>
          {departments.map(([id, dept]) => (
            <option key={id} value={id}>{dept.name}</option>
          ))}
        </select>
        <span className="badge badge-neutral">{filtered.length} shown</span>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="table-container">
          <div className="empty-state">
            <div className="empty-state-icon">👨‍🏫</div>
            <h3>No faculty found</h3>
            <p>Try a different search or add a new faculty member.</p>
          </div>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Faculty Member</th>
                <th>Email</th>
                <th>Designation</th>
                <th>Department</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((f, i) => (
                <tr key={f.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div className={`avatar ${avatarCls(i)}`}>{initials(f.full_name)}</div>
                      <span style={{ fontWeight: 500 }}>{f.full_name}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{f.email}</td>
                  <td><span className="badge badge-warning">{f.designation}</span></td>
                  <td>{f.department?.name ?? '—'}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    {f.created_at ? new Date(f.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td>
                    <div className="action-cell">
                      <button className="btn btn-outline btn-sm" onClick={() => navigate(`/edit-faculty/${f.id}`)}>✏️ Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(f)}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-title">Remove Faculty</div>
            <div className="modal-desc">Remove <strong>{deleteTarget.full_name}</strong> from the system? This cannot be undone.</div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete}>Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Faculty
