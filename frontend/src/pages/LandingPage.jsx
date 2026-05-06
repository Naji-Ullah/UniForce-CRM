import { Link } from 'react-router-dom'

const FEATURES = [
  { icon: '🎓', label: 'Students',    desc: 'Track enrollments, records & progress' },
  { icon: '👨‍🏫', label: 'Faculty',     desc: 'Manage professors and designations' },
  { icon: '🏛️',  label: 'Departments', desc: 'Organize academic departments' },
  { icon: '📋', label: 'Enrollments', desc: 'Link students to departments' },
]

function LandingPage() {
  return (
    <div className="landing">
      <div className="landing-logo">🎓</div>
      <h1>Shizuka UniCRM</h1>
      <p className="landing-sub">
        A modern University Customer Relationship Management system — built to handle
        students, faculty, departments, and enrollments in one clean interface.
      </p>

      <div className="landing-pills">
        {FEATURES.map(f => (
          <div className="landing-pill" key={f.label}>
            {f.icon} {f.label}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link to="/" className="btn btn-primary btn-lg">
          🚀 Enter Dashboard
        </Link>
        <Link to="/students" className="btn btn-outline btn-lg" style={{ color: '#94a3b8', borderColor: 'rgba(255,255,255,0.2)' }}>
          View Students →
        </Link>
      </div>

      <div style={{ marginTop: '4rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', maxWidth: '800px', width: '100%' }}>
        {FEATURES.map(f => (
          <div key={f.label} style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px', padding: '1.25rem', textAlign: 'left'
          }}>
            <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>{f.icon}</div>
            <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '0.25rem' }}>{f.label}</div>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default LandingPage
