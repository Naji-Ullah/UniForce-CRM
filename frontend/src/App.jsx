import { Routes, Route, NavLink } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Students from './pages/Students'
import AddStudent from './pages/AddStudent'
import Faculty from './pages/Faculty'
import AddFaculty from './pages/AddFaculty'

// will add pages after some time
function App() {
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">
          <h2>UniCRM</h2>
        </div>
        <nav>
          <NavLink to="/" className="nav-link" end>Dashboard</NavLink>
          <NavLink to="/students" className="nav-link">Students</NavLink>
          <NavLink to="/add-student" className="nav-link">Add Student</NavLink>
          <NavLink to="/faculty" className="nav-link">Faculty</NavLink>
          <NavLink to="/add-faculty" className="nav-link">Add Faculty</NavLink>
        </nav>
      </aside>
      
      <main className="main-content">
        <header className="header">
          <h1>University CRM System</h1>
        </header>
        
        <div className="content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/students" element={<Students />} />
            <Route path="/add-student" element={<AddStudent />} />
            <Route path="/faculty" element={<Faculty />} />
            <Route path="/add-faculty" element={<AddFaculty />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}

export default App
