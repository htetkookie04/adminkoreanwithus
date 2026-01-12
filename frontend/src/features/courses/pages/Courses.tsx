import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCoursesWithLectures, useCreateCourse, CourseWithLectures } from '../hooks/useCourses'
import { Modal } from '../../../shared'
import CourseForm, { CourseFormData } from '../components/CourseForm'
import { useAuthStore } from '../../auth/store/authStore'
import { Plus, BookOpen, Users, Video, Archive } from 'lucide-react'

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-bold text-gray-900">Courses</h1>
        {!isTeacher && (
          <button 
            className="btn btn-primary flex items-center gap-2" 
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="w-5 h-5" />
            Add Course
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
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Link
              key={course.id}
              to={`/courses/${course.id}`}
              className="card group hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl flex items-center justify-center shadow-md">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-pink-600 transition-colors">
                      {course.title}
                    </h3>
                    <p className="text-sm text-gray-600 font-medium">{course.level}</p>
                  </div>
                </div>
                {!course.active && (
                  <span className="badge bg-gray-100 text-gray-700 flex items-center gap-1">
                    <Archive className="w-3 h-3" />
                    Archived
                  </span>
                )}
              </div>
              
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-gray-600">
                    <Users className="w-4 h-4" />
                    Capacity: {course.capacity}
                  </span>
                  <span className="font-bold text-pink-600">
                    {course.price.toLocaleString()} MMK
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Video className="w-4 h-4" />
                  <span className="font-medium">{(course as CourseWithLectures).lecture_count || 0} Lectures</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

