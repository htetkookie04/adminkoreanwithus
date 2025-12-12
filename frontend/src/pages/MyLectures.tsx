import { useState } from 'react'
import { useLecturesByCourse, useLecture, Lecture } from '../hooks/useLectures'
import { useEnrollments } from '../hooks/useEnrollments'
import VideoPlayer from '../components/VideoPlayer'
import { format } from 'date-fns'
import { useAuthStore } from '../store/authStore'

export default function MyLectures() {
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null)
  const [selectedLectureId, setSelectedLectureId] = useState<number | null>(null)
  const { user } = useAuthStore()

  // Get student's enrollments to show courses
  const { data: enrollmentsData } = useEnrollments({
    userId: user?.id,
    status: 'active',
    per_page: 100
  })

  const enrollments = enrollmentsData?.data || []
  const enrolledCourses = enrollments
    .filter((e: any) => e.course_id)
    .map((e: any) => ({
      id: e.course_id,
      title: e.course_title,
      level: e.course_level
    }))
    .filter((course: any, index: number, self: any[]) => 
      index === self.findIndex((c: any) => c.id === course.id)
    )

  // Get lectures for selected course
  const { data: lecturesData, isLoading: lecturesLoading } = useLecturesByCourse(selectedCourseId || 0)
  const lectures = lecturesData?.data || []

  // Get selected lecture details
  const { data: lectureData, isLoading: lectureLoading } = useLecture(selectedLectureId || 0)
  const lecture = lectureData?.data

  if (enrolledCourses.length === 0) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Lectures</h1>
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500 text-lg mb-2">You are not enrolled in any courses yet.</p>
          <p className="text-gray-400">Please enroll in a course to access recorded lectures.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">My Lectures</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Course List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">My Courses</h2>
            <div className="space-y-2">
              {enrolledCourses.map((course: any) => (
                <button
                  key={course.id}
                  onClick={() => {
                    setSelectedCourseId(course.id)
                    setSelectedLectureId(null)
                  }}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    selectedCourseId === course.id
                      ? 'bg-primary-50 text-primary-700 border-2 border-primary-200'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="font-medium">{course.title}</div>
                  {course.level && (
                    <div className="text-sm text-gray-500">{course.level}</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Lectures List and Video Player */}
        <div className="lg:col-span-2">
          {!selectedCourseId ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500">Select a course to view lectures</p>
            </div>
          ) : selectedLectureId && lecture ? (
            <div className="space-y-6">
              {/* Video Player */}
              <div className="bg-white rounded-lg shadow p-6">
                <VideoPlayer
                  videoUrl={lecture.video_url}
                  title={lecture.title}
                />
                {lecture.description && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
                    <p className="text-sm text-gray-600">{lecture.description}</p>
                  </div>
                )}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex flex-wrap gap-3 mb-3">
                    {lecture.pdf_url && (
                      <a
                        href={lecture.pdf_url.startsWith('http') ? lecture.pdf_url : `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${lecture.pdf_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="inline-flex items-center text-sm text-primary-600 hover:text-primary-800"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        Download PDF
                      </a>
                    )}
                    {lecture.resource_link_url && (
                      <a
                        href={lecture.resource_link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-sm text-primary-600 hover:text-primary-800"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        Resource Link
                      </a>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>Uploaded: {format(new Date(lecture.created_at), 'MMM d, yyyy')}</span>
                    <span className="capitalize">{lecture.role_of_uploader}</span>
                  </div>
                </div>
              </div>

              {/* Back to list button */}
              <button
                onClick={() => setSelectedLectureId(null)}
                className="btn btn-secondary"
              >
                ← Back to Lectures List
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Lectures for {enrolledCourses.find((c: any) => c.id === selectedCourseId)?.title}
              </h2>
              {lecturesLoading ? (
                <div className="text-center py-8">Loading lectures...</div>
              ) : lectures.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No lectures available for this course yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {lectures.map((lecture: Lecture) => (
                    <button
                      key={lecture.id}
                      onClick={() => setSelectedLectureId(lecture.id)}
                      className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{lecture.title}</h3>
                          {lecture.description && (
                            <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                              {lecture.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                            <span>{format(new Date(lecture.created_at), 'MMM d, yyyy')}</span>
                            <span className="capitalize">{lecture.role_of_uploader}</span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <svg
                            className="w-5 h-5 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

