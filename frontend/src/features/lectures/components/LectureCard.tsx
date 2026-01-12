import { format } from 'date-fns'
import LectureResourceViewer from './LectureResourceViewer'
import { Lecture } from '../hooks/useLectures'

interface LectureCardProps {
  lecture: Lecture
  canEdit?: boolean
  onEdit?: (lecture: Lecture) => void
  onDelete?: (id: number) => void
  onWatch?: (lecture: Lecture) => void
}

export default function LectureCard({
  lecture,
  canEdit = false,
  onEdit,
  onDelete,
  onWatch
}: LectureCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
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
        </div>
        <div className="flex items-center gap-2 ml-4">
          {lecture.video_url && onWatch && (
            <button
              onClick={() => onWatch(lecture)}
              className="btn btn-primary btn-sm"
            >
              Watch Video
            </button>
          )}
          {canEdit && onEdit && (
            <button
              onClick={() => onEdit(lecture)}
              className="btn btn-secondary btn-sm"
            >
              Edit
            </button>
          )}
          {canEdit && onDelete && (
            <button
              onClick={() => onDelete(lecture.id)}
              className="btn btn-danger btn-sm"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Resources */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <LectureResourceViewer
          videoUrl={lecture.video_url}
          pdfUrl={lecture.pdf_url}
          resourceLink={lecture.resource_link_url}
        />
      </div>
    </div>
  )
}

