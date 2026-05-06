import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { enrollmentsApi } from '../services/api'

const STATUS_MAP = {
  active:    { cls: 'badge-success', label: 'Active' },
  inactive:  { cls: 'badge-danger',  label: 'Inactive' },
  completed: { cls: 'badge-info',    label: 'Completed' },
}

function Enrollments() {
  const [enrollments, setEnrollments] = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [msg, setMsg] = useState(null)

  const fetchEnrollments = async () => {
    setLoading(true)
    const { data, error } = await enrollmentsApi.getAll()
    if (error) setMsg({ type: 'error', text: error })
    else { setEnrollments(data); setFiltered(data) }
    setLoading(false)
  }

  useEffect(() => { fetchEnrollments() }, [])

  useEffect(() => {
    let data = enrollments
    if (search) {
      const q = search.toLowerCase()
      data = data.filter(e =>
        e.student?.full_name?.toLowerCase().includes(q) ||
        e.department?.name?.toLowerCase().includes(q) ||
        e.student?.roll_number?.toLowerCase().includes(q)
      )
    }
    if (statusFilter) data = data.filter(e => e.status === statusFilter)
    setFiltered(data)
  }, [search, statusFilter, enrollments])

  const handleDelete = async () => {
    const { error } = await enrollmentsApi.remove(deleteTarget.id)
    if (error) setMsg({ type: 'error', text: error })
    else {
      setMsg({ type: 'success', text: 'Enrollment removed.' })
      fetchEnrollments()
    }
    setDeleteTarget(null)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Enrollments</div>
          <div className="page-desc">{enrollments.length} student-department enrollments</div>
        </div>
        <Link to="/add-enrollment" className="btn btn-primary">+ Add Enrollment</Link>
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
          <input type="text" placeholder="Search by student name, roll no or department…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="completed">Completed</option>
        </select>
        <span className="badge badge-neutral">{filtered.length} shown</span>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="table-container">
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <h3>No enrollments found</h3>
            <p>Enroll a student in a department to get started.</p>
          </div>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Student</th>
                <th>Roll No.</th>
                <th>Department</th>
                <th>Status</th>
                <th>Enrolled At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e, i) => {
                const badge = STATUS_MAP[e.status] ?? { cls: 'badge-neutral', label: e.status }
                return (
                  <tr key={e.id}>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{i + 1}</td>
                    <td style={{ fontWeight: 500 }}>{e.student?.full_name ?? '—'}</td>
                    <td>
                      <code style={{ background: 'var(--surface-2)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem' }}>
                        {e.student?.roll_number ?? '—'}
                      </code>
                    </td>
                    <td>{e.department?.name ?? '—'}</td>
                    <td><span className={`badge ${badge.cls}`}>{badge.label}</span></td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      {e.enrolled_at ? new Date(e.enrolled_at).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(e)}>🗑️</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-title">Remove Enrollment</div>
            <div className="modal-desc">
              Remove enrollment for <strong>{deleteTarget.student?.full_name}</strong> in <strong>{deleteTarget.department?.name}</strong>?
            </div>
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

export default Enrollments
