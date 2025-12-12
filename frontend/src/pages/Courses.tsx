import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCoursesWithLectures, useCreateCourse, CourseWithLectures } from '../hooks/useCourses'
import Modal from '../components/Modal'
import CourseForm, { CourseFormData } from '../components/forms/CourseForm'
import { useAuthStore } from '../store/authStore'

export default function Courses() {
  const { user } = useAuthStore()
  const [isModalOpen, setIsModalOpen] = useState(false)

  const isAdmin = user?.roleName === 'admin' || user?.roleName === 'super_admin'
  const isTeacher = user?.roleName === 'teacher'

  const { data, isLoading } = useCoursesWithLectures()
  const createCourseMutation = useCreateCourse()

  const courses = data?.data || []

  const handleSubmit = async (formData: CourseFormData) => {
    await createCourseMutation.mutateAsync(formData)
    setIsModalOpen(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Courses</h1>
        {!isTeacher && (
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            + Add Course
          </button>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Course"
        size="lg"
      >
        <CourseForm
          onSubmit={handleSubmit}
          onCancel={() => setIsModalOpen(false)}
          isLoading={createCourseMutation.isPending}
        />
      </Modal>

      {isLoading ? (
        <div className="text-center py-12">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Link
              key={course.id}
              to={`/courses/${course.id}`}
              className="card hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900">{course.title}</h3>
                {!course.active && (
                  <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                    Archived
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-4">{course.level}</p>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600">Capacity: {course.capacity}</span>
                <span className="font-medium text-gray-900">{course.price.toLocaleString()} MMK</span>
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-medium">Lectures: </span>
                <span>{(course as CourseWithLectures).lecture_count || 0}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

