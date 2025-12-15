import { useState } from 'react'
import VideoPlayer from './VideoPlayer'

interface LectureResourceViewerProps {
  videoUrl?: string | null
  pdfUrl?: string | null
  resourceLink?: string | null
  title?: string
  className?: string
}

export default function LectureResourceViewer({
  videoUrl,
  pdfUrl,
  resourceLink,
  title,
  className = ''
}: LectureResourceViewerProps) {
  const [showVideoModal, setShowVideoModal] = useState(false)
  const [showPdfModal, setShowPdfModal] = useState(false)

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

  // Helper to construct full URL
  const getFullUrl = (url: string) => {
    return url.startsWith('http') ? url : `${API_URL}${url}`
  }

  // Check if any resource exists
  const hasResources = !!(videoUrl || pdfUrl || resourceLink)

  if (!hasResources) {
    return (
      <div className={`bg-gray-50 rounded-lg p-6 text-center ${className}`}>
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p className="mt-2 text-sm text-gray-500">No resources available for this lecture</p>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {title && (
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      )}

      {/* Video Resource */}
      {videoUrl && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg
                className="h-5 w-5 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              <span className="font-medium text-gray-900">Video</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowVideoModal(true)}
                className="btn btn-primary btn-sm"
              >
                Watch
              </button>
              <a
                href={getFullUrl(videoUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm"
              >
                Open
              </a>
              <a
                href={getFullUrl(videoUrl)}
                download
                className="btn btn-outline btn-sm"
              >
                Download
              </a>
            </div>
          </div>
          {showVideoModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
              <div className="bg-white rounded-lg max-w-4xl w-full p-6 relative">
                <button
                  onClick={() => setShowVideoModal(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
                <VideoPlayer videoUrl={videoUrl} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* PDF Resource */}
      {pdfUrl && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg
                className="h-5 w-5 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
              <span className="font-medium text-gray-900">PDF Document</span>
            </div>
            <div className="flex gap-2">
              <a
                href={getFullUrl(pdfUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-sm"
              >
                View PDF
              </a>
              <a
                href={getFullUrl(pdfUrl)}
                download
                className="btn btn-secondary btn-sm"
              >
                Download
              </a>
            </div>
          </div>
          {showPdfModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
              <div className="bg-white rounded-lg max-w-4xl w-full p-6 relative">
                <button
                  onClick={() => setShowPdfModal(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
                <iframe
                  src={getFullUrl(pdfUrl)}
                  className="w-full h-[80vh] rounded"
                  title="PDF Preview"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* External Resource Link */}
      {resourceLink && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg
                className="h-5 w-5 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
              <span className="font-medium text-gray-900">External Resource</span>
            </div>
            <a
              href={resourceLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-sm"
            >
              Open Link
            </a>
          </div>
          <p className="mt-2 text-sm text-gray-600 break-all">{resourceLink}</p>
        </div>
      )}
    </div>
  )
}

