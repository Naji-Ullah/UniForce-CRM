import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { dashboardApi, studentsApi, facultyApi } from '../services/api'

function Dashboard() {
  const [counts, setCounts] = useState(null)
  const [recentStudents, setRecentStudents] = useState([])
  const [recentFaculty, setRecentFaculty] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dashboardApi.getStats().then(({ data, error }) => {
      if (data) {
        setCounts(data.counts)
        setRecentStudents(data.recent_students ?? [])
        setRecentFaculty(data.recent_faculty ?? [])
      }
      setLoading(false)
    })
  }, [])

  const STAT_CARDS = [
    { label: 'Total Students',    value: counts?.total_students    ?? '–', icon: '🎓', cls: 'teal',  trend: 'Active learners' },
    { label: 'Total Faculty',     value: counts?.total_faculty     ?? '–', icon: '👨‍🏫', cls: 'amber', trend: 'Teaching staff' },
    { label: 'Departments',       value: counts?.total_departments ?? '–', icon: '🏛️',  cls: 'blue',  trend: 'Academic units' },
    { label: 'Active Enrollments',value: counts?.active_enrollments ?? '–', icon: '📋', cls: 'green', trend: 'Current semester' },
  ]

  const initials = name => name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '?'
  const avatarCls = i => ['avatar-teal', 'avatar-amber', 'avatar-blue'][i % 3]

  if (loading) return (
    <div className="loading">
      <div className="spinner" />
      <span>Loading dashboard…</span>
    </div>
  )

  return (
    <div>
      {/* Stat Cards */}
      <div className="stats-grid">
        {STAT_CARDS.map(s => (
          <div className="stat-card" key={s.label}>
            <div className={`stat-icon ${s.cls}`}>{s.icon}</div>
            <div className="stat-info">
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-trend">{s.trend}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <span className="card-title">⚡ Quick Actions</span>
        </div>
        <div className="card-body" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link to="/add-student"    className="btn btn-primary">+ Add Student</Link>
          <Link to="/add-faculty"    className="btn btn-accent">+ Add Faculty</Link>
          <Link to="/add-department" className="btn btn-outline">+ Add Department</Link>
          <Link to="/add-enrollment" className="btn btn-outline">+ Add Enrollment</Link>
        </div>
      </div>

      {/* Recent Lists */}
      <div className="recent-sections">
        <div className="card">
          <div className="card-header">
            <span className="card-title">🎓 Recent Students</span>
            <Link to="/students" className="btn btn-outline btn-sm">View All</Link>
          </div>
          <div className="card-body" style={{ padding: '0.75rem 1rem' }}>
            {recentStudents.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem' }}><div>No students yet</div></div>
            ) : recentStudents.map((s, i) => (
              <div className="recent-item" key={s.id}>
                <div className={`avatar ${avatarCls(i)}`}>{initials(s.full_name)}</div>
                <div className="recent-item-info">
                  <div className="recent-item-name">{s.full_name}</div>
                  <div className="recent-item-meta">{s.roll_number} · Semester {s.semester}</div>
                </div>
                <span className="badge badge-success">Active</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">👨‍🏫 Recent Faculty</span>
            <Link to="/faculty" className="btn btn-outline btn-sm">View All</Link>
          </div>
          <div className="card-body" style={{ padding: '0.75rem 1rem' }}>
            {recentFaculty.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem' }}><div>No faculty yet</div></div>
            ) : recentFaculty.map((f, i) => (
              <div className="recent-item" key={f.id}>
                <div className={`avatar ${avatarCls(i + 1)}`}>{initials(f.full_name)}</div>
                <div className="recent-item-info">
                  <div className="recent-item-name">{f.full_name}</div>
                  <div className="recent-item-meta">{f.designation} · {f.department?.name ?? 'N/A'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
