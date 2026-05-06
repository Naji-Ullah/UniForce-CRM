import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import Dashboard     from './pages/Dashboard'
import Students      from './pages/Students'
import AddStudent    from './pages/AddStudent'
import EditStudent   from './pages/EditStudent'
import Faculty       from './pages/Faculty'
import AddFaculty    from './pages/AddFaculty'
import EditFaculty   from './pages/EditFaculty'
import Departments   from './pages/Departments'
import AddDepartment from './pages/AddDepartment'
import Enrollments   from './pages/Enrollments'
import AddEnrollment from './pages/AddEnrollment'
import Users         from './pages/Users'
import LandingPage   from './pages/LandingPage'

const NAV = [
  {
    label: 'Overview',
    items: [
      { to: '/',          icon: '⊞', label: 'Dashboard' },
    ],
  },
  {
    label: 'Academic',
    items: [
      { to: '/students',    icon: '🎓', label: 'Students' },
      { to: '/enrollments', icon: '📋', label: 'Enrollments' },
      { to: '/faculty',     icon: '👨‍🏫', label: 'Faculty' },
      { to: '/departments', icon: '🏛️',  label: 'Departments' },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/users', icon: '👤', label: 'Users' },
    ],
  },
]

const PAGE_TITLES = {
  '/':              { title: 'Dashboard',     sub: 'Overview of all academic data' },
  '/students':      { title: 'Students',      sub: 'Manage student records' },
  '/add-student':   { title: 'Add Student',   sub: 'Register a new student' },
  '/faculty':       { title: 'Faculty',       sub: 'Manage faculty members' },
  '/add-faculty':   { title: 'Add Faculty',   sub: 'Register a new faculty member' },
  '/departments':   { title: 'Departments',   sub: 'Manage academic departments' },
  '/add-department':{ title: 'Add Department',sub: 'Create a new department' },
  '/enrollments':   { title: 'Enrollments',   sub: 'Student department enrollments' },
  '/add-enrollment':{ title: 'Add Enrollment',sub: 'Enroll a student in a department' },
  '/users':         { title: 'Users',         sub: 'System user accounts' },
}

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <div className="logo-icon">U</div>
          <div>
            <div className="logo-text">UniCRM</div>
            <div className="logo-sub">University System</div>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV.map(section => (
          <div key={section.label}>
            <div className="nav-section-label">{section.label}</div>
            {section.items.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div>Shizuka CRM · v1.0</div>
        <div style={{ marginTop: '4px', fontSize: '0.7rem', opacity: 0.6 }}>Database Semester Project</div>
      </div>
    </aside>
  )
}

function Topbar() {
  const location = useLocation()
  const info = PAGE_TITLES[location.pathname] || { title: 'UniCRM', sub: '' }
  const now = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  return (
    <header className="topbar">
      <div>
        <div className="topbar-title">{info.title}</div>
        {info.sub && <div className="topbar-sub">{info.sub}</div>}
      </div>
      <div className="topbar-right">
        <span className="topbar-badge">📅 {now}</span>
      </div>
    </header>
  )
}

function Layout({ children }) {
  return (
    <div className="app">
      <Sidebar />
      <div className="main-content">
        <Topbar />
        <main className="content">{children}</main>
      </div>
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/welcome" element={<LandingPage />} />
      <Route path="/*" element={
        <Layout>
          <Routes>
            <Route path="/"              element={<Dashboard />} />
            <Route path="/students"      element={<Students />} />
            <Route path="/add-student"   element={<AddStudent />} />
            <Route path="/edit-student/:id" element={<EditStudent />} />
            <Route path="/faculty"       element={<Faculty />} />
            <Route path="/add-faculty"   element={<AddFaculty />} />
            <Route path="/edit-faculty/:id" element={<EditFaculty />} />
            <Route path="/departments"   element={<Departments />} />
            <Route path="/add-department" element={<AddDepartment />} />
            <Route path="/enrollments"   element={<Enrollments />} />
            <Route path="/add-enrollment" element={<AddEnrollment />} />
            <Route path="/users"         element={<Users />} />
          </Routes>
        </Layout>
      } />
    </Routes>
  )
}

export default App
