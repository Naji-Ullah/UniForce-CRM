import { useState, useEffect } from 'react'
import { usersApi } from '../services/api'

const ROLE_MAP = {
  admin: { cls: 'badge-danger', label: 'Admin' },
  staff: { cls: 'badge-info',   label: 'Staff' },
}

function Users() {
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ username: '', password: '', role: 'staff' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const fetchUsers = async () => {
    setLoading(true)
    const { data, error } = await usersApi.getAll()
    if (error) setMsg({ type: 'error', text: error })
    else setUsers(data)
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  const filtered = users.filter(u => u.username.toLowerCase().includes(search.toLowerCase()))

  const handleAdd = async e => {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    const { error } = await usersApi.create(form)
    if (error) {
      setMsg({ type: 'error', text: error })
    } else {
      setMsg({ type: 'success', text: 'User created!' })
      setForm({ username: '', password: '', role: 'staff' })
      setShowForm(false)
      fetchUsers()
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    const { error } = await usersApi.remove(deleteTarget.id)
    if (error) setMsg({ type: 'error', text: error })
    else { setMsg({ type: 'success', text: 'User deleted.' }); fetchUsers() }
    setDeleteTarget(null)
  }

  const initials = name => name?.slice(0, 2).toUpperCase() ?? '?'

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">System Users</div>
          <div className="page-desc">{users.length} registered user accounts</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(v => !v)}>
          {showForm ? '✕ Cancel' : '+ Add User'}
        </button>
      </div>

      {msg && (
        <div className={`alert alert-${msg.type}`} style={{ marginBottom: '1rem' }}>
          {msg.type === 'success' ? '✅' : '❌'} {msg.text}
          <button onClick={() => setMsg(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
        </div>
      )}

      {showForm && (
        <div className="form-card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontWeight: 600, marginBottom: '1rem', color: 'var(--text-primary)' }}>New User Account</div>
          <form onSubmit={handleAdd}>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Username *</label>
                <input className="form-input" value={form.username}
                  onChange={e => setForm({ ...form, username: e.target.value })}
                  placeholder="e.g. admin_01" required />
              </div>
              <div className="form-group">
                <label className="form-label">Password *</label>
                <input className="form-input" type="password" value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="Minimum 6 characters" required minLength={6} />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: '1.25rem' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Creating…' : '✓ Create User'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="toolbar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input type="text" placeholder="Search by username…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <span className="badge badge-neutral">{filtered.length} shown</span>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="table-container">
          <div className="empty-state">
            <div className="empty-state-icon">👤</div>
            <h3>No users found</h3>
          </div>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => {
                const badge = ROLE_MAP[u.role] ?? { cls: 'badge-neutral', label: u.role }
                return (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div className={`avatar ${['avatar-teal', 'avatar-amber', 'avatar-blue'][i % 3]}`}>{initials(u.username)}</div>
                        <span style={{ fontWeight: 500 }}>{u.username}</span>
                      </div>
                    </td>
                    <td><span className={`badge ${badge.cls}`}>{badge.label}</span></td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(u)}>🗑️</button>
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
            <div className="modal-title">Delete User</div>
            <div className="modal-desc">Delete account <strong>{deleteTarget.username}</strong>? This cannot be undone.</div>
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

export default Users
