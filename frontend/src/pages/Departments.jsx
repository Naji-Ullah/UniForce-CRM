import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { departmentsApi } from '../services/api'

function Departments() {
  const [departments, setDepartments] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [msg, setMsg] = useState(null)

  const fetchDepts = async () => {
    setLoading(true)
    const { data, error } = await departmentsApi.getAll()
    if (error) setMsg({ type: 'error', text: error })
    else setDepartments(data)
    setLoading(false)
  }

  useEffect(() => { fetchDepts() }, [])

  const handleDelete = async () => {
    const { error } = await departmentsApi.remove(deleteTarget.id)
    if (error) setMsg({ type: 'error', text: error })
    else {
      setMsg({ type: 'success', text: `Department "${deleteTarget.name}" deleted.` })
      fetchDepts()
    }
    setDeleteTarget(null)
  }

  const filtered = departments.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.code.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Departments</div>
          <div className="page-desc">{departments.length} academic departments</div>
        </div>
        <Link to="/add-department" className="btn btn-primary">+ Add Department</Link>
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
          <input type="text" placeholder="Search by name or code…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <span className="badge badge-neutral">{filtered.length} shown</span>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="table-container">
          <div className="empty-state">
            <div className="empty-state-icon">🏛️</div>
            <h3>No departments found</h3>
            <p>Add a department to get started.</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {filtered.map(dept => (
            <div className="card" key={dept.id} style={{ padding: '0' }}>
              <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <div style={{ width: 44, height: 44, background: 'var(--primary-light)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>🏛️</div>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{dept.name}</div>
                    <code style={{ fontSize: '0.75rem', background: 'var(--surface-2)', padding: '1px 6px', borderRadius: '4px', color: 'var(--primary-dark)' }}>{dept.code}</code>
                  </div>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Created {dept.created_at ? new Date(dept.created_at).toLocaleDateString() : '—'}
                </div>
              </div>
              <div style={{ padding: '0.75rem 1.25rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(dept)}>🗑️ Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-title">Delete Department</div>
            <div className="modal-desc">
              Delete <strong>{deleteTarget.name}</strong>? This will fail if faculty or enrollments are linked to it.
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Departments
