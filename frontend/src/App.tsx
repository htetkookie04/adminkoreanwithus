import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Layout from './components/Layout'
import { ToastContainer } from './components/Toast'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import UserDetail from './pages/UserDetail'
import Courses from './pages/Courses'
import CourseDetail from './pages/CourseDetail'
import Enrollments from './pages/Enrollments'
import EnrollmentDetail from './pages/EnrollmentDetail'
import Settings from './pages/Settings'
import Timetable from './pages/Timetable'
import Gallery from './pages/Gallery'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  const { isAuthenticated } = useAuthStore()

  return (
    <BrowserRouter>
      <ToastContainer />
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="users/:id" element={<UserDetail />} />
          <Route path="courses" element={<Courses />} />
          <Route path="courses/:id" element={<CourseDetail />} />
          <Route path="enrollments" element={<Enrollments />} />
          <Route path="enrollments/:id" element={<EnrollmentDetail />} />
          <Route path="settings" element={<Settings />} />
          <Route path="timetable" element={<Timetable />} />
          <Route path="gallery" element={<Gallery />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App

