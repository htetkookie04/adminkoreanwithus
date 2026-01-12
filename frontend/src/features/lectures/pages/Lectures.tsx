import { useNavigate } from 'react-router-dom'
import { useCoursesWithLectures, CourseWithLectures } from '../../courses/hooks/useCourses'

export default function Lectures() {
  const navigate = useNavigate()
  const { data, isLoading, error } = useCoursesWithLectures()
  const courses = data?.data || []

  const handleCourseClick = (courseId: number) => {
    if (!courseId || courseId <= 0) {
      console.error('Invalid course ID:', courseId)
      return
    }
    navigate(`/lectures/${courseId}`)
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Lectures</h1>
        <p className="text-gray-600 mt-2">Select a course to view its lectures</p>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="text-gray-500 mt-4">Loading courses...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12 bg-white rounded-lg shadow p-8">
          <p className="text-red-500 text-lg mb-2">Error loading courses.</p>
          <p className="text-gray-400">Please try again later.</p>
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow p-8">
          <p className="text-gray-500 text-lg mb-2">No courses available.</p>
          <p className="text-gray-400">You are not enrolled in any courses yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course: CourseWithLectures) => (
            <div
              key={course.id}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer border border-gray-200"
              onClick={() => handleCourseClick(course.id)}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-900">{course.title}</h3>
                  {!course.active && (
                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                      Archived
                    </span>
                  )}
                </div>

                <div className="space-y-2 mb-4">
                  {course.level && (
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="font-medium mr-2">Level:</span>
                      <span>{course.level}</span>
                    </div>
                  )}

                  {course.teacher_name && (
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="font-medium mr-2">Teacher:</span>
                      <span>{course.teacher_name}</span>
                    </div>
                  )}

                  <div className="flex items-center text-sm text-gray-600">
                    <span className="font-medium mr-2">Lectures:</span>
                    <span>{course.lecture_count ?? 0}</span>
                  </div>
                </div>

                <button
                  className="w-full btn btn-primary"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCourseClick(course.id)
                  }}
                >
                  Open
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
