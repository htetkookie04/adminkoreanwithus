interface VideoPlayerProps {
  videoUrl: string
  title?: string
  className?: string
}

import { useState } from 'react'

export default function VideoPlayer({ videoUrl, title, className = '' }: VideoPlayerProps) {
  const [error, setError] = useState<string | null>(null)
  
  // Construct full URL if it's a relative path
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
  const fullVideoUrl = videoUrl.startsWith('http') ? videoUrl : `${API_URL}${videoUrl}`

  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const video = e.currentTarget
    let errorMsg = 'Failed to load video'
    
    if (video.error) {
      switch (video.error.code) {
        case video.error.MEDIA_ERR_ABORTED:
          errorMsg = 'Video loading aborted'
          break
        case video.error.MEDIA_ERR_NETWORK:
          errorMsg = 'Network error while loading video'
          break
        case video.error.MEDIA_ERR_DECODE:
          errorMsg = 'Video decoding error'
          break
        case video.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorMsg = 'Video format not supported'
          break
      }
    }
    
    setError(errorMsg)
    console.error('Video error:', video.error, 'URL:', fullVideoUrl)
  }

  return (
    <div className={className}>
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      )}
      <div className="bg-black rounded-lg overflow-hidden aspect-video">
        {error ? (
          <div className="flex items-center justify-center h-full text-white">
            <div className="text-center">
              <p className="text-red-400 mb-2">{error}</p>
              <a
                href={fullVideoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                Try opening video in new tab
              </a>
            </div>
          </div>
        ) : (
          <video
            src={fullVideoUrl}
            controls
            className="w-full h-full"
            preload="metadata"
            crossOrigin="anonymous"
            playsInline
            onError={handleVideoError}
          >
            <source src={fullVideoUrl} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        )}
      </div>
      <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
        <a
          href={fullVideoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-600 hover:text-primary-800"
        >
          Open in new tab
        </a>
        <a
          href={fullVideoUrl}
          download
          className="text-primary-600 hover:text-primary-800"
        >
          Download Video
        </a>
      </div>
    </div>
  )
}

