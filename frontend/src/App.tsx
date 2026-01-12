import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore, Login, ProtectedRoute } from './features/auth'
import { Layout, ToastContainer } from './shared'
import { Dashboard } from './features/dashboard'
import { Users, UserDetail } from './features/users'
import { Courses, CourseDetail } from './features/courses'
import { Enrollments, EnrollmentDetail } from './features/enrollments'
import { Settings } from './features/settings'
import { Timetable } from './features/schedule'
import { Lectures, CourseLecturePage, MyLectures } from './features/lectures'

function App() {
  const { isAuthenticated, user } = useAuthStore()

  return (
    <BrowserRouter>
      <ToastContainer />
      <Routes>
        <Route 
          path="/login" 
          element={
            isAuthenticated 
              ? (user?.roleName === 'viewer' || user?.roleName === 'user' ? <Navigate to="/lectures" /> : <Navigate to="/" />)
              : <Login /> 
          } 
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={user?.roleName === 'viewer' || user?.roleName === 'user' ? <Navigate to="/lectures" replace /> : <Dashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="users/:id" element={<UserDetail />} />
          <Route path="courses" element={<Courses />} />
          <Route path="courses/:id" element={<CourseDetail />} />
          <Route path="enrollments" element={<Enrollments />} />
          <Route path="enrollments/:id" element={<EnrollmentDetail />} />
          <Route path="lectures" element={<Lectures />} />
          <Route path="lectures/:courseId" element={<CourseLecturePage />} />
          <Route path="my-lectures" element={<MyLectures />} />
          <Route path="settings" element={<Settings />} />
          <Route path="timetable" element={<Timetable />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App

