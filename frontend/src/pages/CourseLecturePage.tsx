import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLecturesByCourse, useCreateLecture, useDeleteLecture, useUpdateLecture, Lecture, LectureFormData } from '../hooks/useLectures'
import { useCourse } from '../hooks/useCourses'
import Modal from '../components/Modal'
import UploadLectureForm from '../components/forms/UploadLectureForm'
import { useAuthStore } from '../store/authStore'
import { format } from 'date-fns'
import { toast } from '../components/Toast'
import VideoPlayer from '../components/VideoPlayer'

export default function CourseLecturePage() {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingLecture, setEditingLecture] = useState<Lecture | null>(null)
  const [selectedLecture, setSelectedLecture] = useState<Lecture | null>(null)
  const { user } = useAuthStore()

  const courseIdNum = courseId ? parseInt(courseId) : 0
  const { data: courseData, isLoading: courseLoading } = useCourse(courseIdNum)
  const { data: lecturesData, isLoading: lecturesLoading } = useLecturesByCourse(courseIdNum)
  const createLectureMutation = useCreateLecture()
  const updateLectureMutation = useUpdateLecture()
  const deleteLectureMutation = useDeleteLecture()

  const course = courseData?.data
  const lectures = lecturesData?.data || []

  const isAdmin = user?.roleName === 'admin' || user?.roleName === 'super_admin'
  const isTeacher = user?.roleName === 'teacher'
  const canUpload = isAdmin || isTeacher

  const handleSubmit = async (formData: LectureFormData) => {
    try {
      if (editingLecture) {
        await updateLectureMutation.mutateAsync({
          id: editingLecture.id,
          data: {
            course_id: courseIdNum,
            title: formData.title,
            description: formData.description
          }
        })
      } else {
        // Validation is handled by the form schema
        await createLectureMutation.mutateAsync({
          ...formData,
          course_id: courseIdNum
        })
      }
      setIsModalOpen(false)
      setEditingLecture(null)
    } catch (error: any) {
      // Error toast is handled by the mutation hooks
    }
  }

  const handleEdit = (lecture: Lecture) => {
    setEditingLecture(lecture)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this lecture?')) {
      await deleteLectureMutation.mutateAsync(id)
      // Success/error toast is handled by the mutation hook
    }
  }

  const handleCancel = () => {
    setIsModalOpen(false)
    setEditingLecture(null)
  }

  const handleWatch = (lecture: Lecture) => {
    if (lecture.video_url) {
      setSelectedLecture(lecture)
    }
  }

  const handleCloseVideo = () => {
    setSelectedLecture(null)
  }

  // Reset editing state when modal closes
  useEffect(() => {
    if (!isModalOpen) {
      setEditingLecture(null)
    }
  }, [isModalOpen])

  if (courseLoading || lecturesLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <p className="text-gray-500 mt-4">Loading...</p>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Course not found.</p>
        <button className="btn btn-secondary mt-4" onClick={() => navigate('/lectures')}>
          Back to Courses
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <button
            onClick={() => navigate('/lectures')}
            className="text-gray-600 hover:text-gray-900 mb-2 flex items-center"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Courses
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{course.title}</h1>
          {course.level && (
            <p className="text-gray-600 mt-1">Level: {course.level}</p>
          )}
        </div>
        {canUpload && (
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            + Upload Lecture
          </button>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCancel}
        title={editingLecture ? 'Edit Lecture' : 'Upload New Lecture'}
        size="lg"
      >
        <UploadLectureForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={createLectureMutation.isPending || updateLectureMutation.isPending}
          initialData={editingLecture ? {
            course_id: courseIdNum,
            title: editingLecture.title,
            description: editingLecture.description,
            resource_link_url: editingLecture.resource_link_url || ''
          } : {
            course_id: courseIdNum
          }}
        />
      </Modal>

      {selectedLecture && (
        <Modal
          isOpen={!!selectedLecture}
          onClose={handleCloseVideo}
          title={selectedLecture.title}
          size="xl"
        >
          {selectedLecture.video_url ? (
            <VideoPlayer videoUrl={selectedLecture.video_url} />
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No video available for this lecture.</p>
            </div>
          )}
          {selectedLecture.description && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-gray-600">{selectedLecture.description}</p>
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex flex-wrap gap-3">
              {selectedLecture.pdf_url && (
                <a
                  href={selectedLecture.pdf_url.startsWith('http') ? selectedLecture.pdf_url : `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${selectedLecture.pdf_url}`}
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
              {selectedLecture.resource_link_url && (
                <a
                  href={selectedLecture.resource_link_url}
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
          </div>
        </Modal>
      )}

      {lectures.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 mb-4">No lectures uploaded yet.</p>
          {canUpload && (
            <button
              className="btn btn-primary"
              onClick={() => setIsModalOpen(true)}
            >
              Upload Your First Lecture
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="divide-y divide-gray-200">
            {lectures.map((lecture) => (
              <div key={lecture.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{lecture.title}</h3>
                    {lecture.description && (
                      <p className="text-gray-600 mb-3">{lecture.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>Uploaded: {format(new Date(lecture.created_at), 'MMM d, yyyy')}</span>
                      {lecture.uploader_name && (
                        <span>By: {lecture.uploader_name}</span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3">
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
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {lecture.video_url && (
                      <button
                        onClick={() => handleWatch(lecture)}
                        className="btn btn-primary"
                      >
                        Watch
                      </button>
                    )}
                    {canUpload && (isAdmin || lecture.uploaded_by === user?.id) && (
                      <>
                        <button
                          onClick={() => handleEdit(lecture)}
                          className="btn btn-secondary"
                        >
                          Edit
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(lecture.id)}
                            className="btn btn-danger"
                          >
                            Delete
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

