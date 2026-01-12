import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect } from 'react'
import { useCourses } from '../../courses/hooks/useCourses'

const createLectureSchema = z.object({
  course_id: z.number().int().positive('Course is required'),
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional(),
  video: z.any().optional()
    .refine((file) => !file || (file instanceof File && file.size <= 500 * 1024 * 1024), 'Video file size must be less than 500MB')
    .refine(
      (file) => !file || (file instanceof File && ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'].includes(file.type)),
      'Only video files are allowed (mp4, webm, ogg, mov, avi, mkv)'
    ),
  pdf: z.any().optional()
    .refine((file) => !file || (file instanceof File && file.size <= 50 * 1024 * 1024), 'PDF file size must be less than 50MB')
    .refine(
      (file) => !file || (file instanceof File && file.type === 'application/pdf'),
      'Only PDF files are allowed'
    ),
  resource_link_url: z.string().optional().refine(
    (val) => {
      if (!val || val.trim() === '') return true
      const trimmed = val.trim()
      // More lenient URL validation - accept any string that looks like a URL
      // This allows Google Drive folder links and other valid URLs
      try {
        new URL(trimmed)
        return true
      } catch {
        // Also accept strings that start with http:// or https://
        return trimmed.startsWith('http://') || trimmed.startsWith('https://')
      }
    },
    'Invalid resource link URL format'
    )
}).refine(
  (data) => {
    const hasVideo = data.video instanceof File
    const hasPdf = data.pdf instanceof File
    const hasResourceLink = data.resource_link_url && data.resource_link_url.trim() !== ''
    // If resource link is provided, video/PDF is optional
    if (hasResourceLink) {
      return true
    }
    // Otherwise, require at least one video or PDF file
    return hasVideo || hasPdf
  },
  {
    message: 'At least one content source (video file, PDF file, or Resource Link URL) must be provided',
    path: ['video'] // This will show the error on the form
  }
)

const updateLectureSchema = z.object({
  course_id: z.number().int().positive('Course is required'),
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional(),
  video: z.any().optional()
    .refine((file) => !file || (file instanceof File && file.size <= 500 * 1024 * 1024), 'Video file size must be less than 500MB')
    .refine(
      (file) => !file || (file instanceof File && ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'].includes(file.type)),
      'Only video files are allowed (mp4, webm, ogg, mov, avi, mkv)'
    ),
  pdf: z.any().optional()
    .refine((file) => !file || (file instanceof File && file.size <= 50 * 1024 * 1024), 'PDF file size must be less than 50MB')
    .refine(
      (file) => !file || (file instanceof File && file.type === 'application/pdf'),
      'Only PDF files are allowed'
    ),
  resource_link_url: z.string().optional().refine(
    (val) => {
      if (!val || val.trim() === '') return true
      const trimmed = val.trim()
      // More lenient URL validation - accept any string that looks like a URL
      // This allows Google Drive folder links and other valid URLs
      try {
        new URL(trimmed)
        return true
      } catch {
        // Also accept strings that start with http:// or https://
        return trimmed.startsWith('http://') || trimmed.startsWith('https://')
      }
    },
    'Invalid resource link URL format'
    )
})

export type LectureFormData = z.infer<typeof createLectureSchema> | z.infer<typeof updateLectureSchema>

interface UploadLectureFormProps {
  onSubmit: (data: LectureFormData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
  initialData?: Partial<Omit<LectureFormData, 'video' | 'pdf'>>
}

export default function UploadLectureForm({ onSubmit, onCancel, isLoading, initialData }: UploadLectureFormProps) {
  const { data: coursesData } = useCourses({ per_page: 100, active: true })
  const courses = coursesData?.data || []
  // Only consider it edit mode if initialData has a title (meaning we're editing an existing lecture)
  // If only course_id is provided, it's a new lecture for that course
  const isEditMode = !!initialData?.title

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    control
  } = useForm<LectureFormData>({
    resolver: zodResolver(isEditMode ? updateLectureSchema : createLectureSchema),
    defaultValues: {
      course_id: initialData?.course_id || undefined,
      title: initialData?.title || '',
      description: initialData?.description || '',
      video: undefined,
      pdf: undefined,
      resource_link_url: initialData?.resource_link_url || ''
    }
  })

  const selectedVideo = watch('video')
  const selectedPdf = watch('pdf')
  const resourceLinkUrl = watch('resource_link_url')

  useEffect(() => {
    if (initialData) {
      reset({
        ...initialData,
        video: undefined,
        pdf: undefined,
        resource_link_url: initialData.resource_link_url || ''
      })
    } else {
      reset({
        course_id: undefined,
        title: '',
        description: '',
        video: undefined,
        pdf: undefined,
        resource_link_url: ''
      })
    }
  }, [initialData, reset])

  const courseIdProvided = !!initialData?.course_id
  const selectedCourse = courses.find(c => c.id === initialData?.course_id)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {courseIdProvided && selectedCourse ? (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Course
          </label>
          <div className="input w-full bg-gray-50">
            {selectedCourse.title} {selectedCourse.level ? `(${selectedCourse.level})` : ''}
          </div>
          <input type="hidden" {...register('course_id', { valueAsNumber: true })} />
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Course <span className="text-red-500">*</span>
          </label>
          <select
            {...register('course_id', { valueAsNumber: true })}
            className="input w-full"
          >
            <option value="">Select a course</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title} {course.level ? `(${course.level})` : ''}
              </option>
            ))}
          </select>
          {errors.course_id && <p className="text-red-500 text-xs mt-1">{errors.course_id.message}</p>}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          {...register('title')}
          className="input w-full"
          placeholder="Introduction to Korean Alphabet"
          maxLength={255}
        />
        {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          {...register('description')}
          className="input w-full"
          rows={4}
          placeholder="Lecture description..."
        />
        {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Video File (Optional)
        </label>
        <Controller
          name="video"
          control={control}
          render={({ field: { onChange, value, ...field }, fieldState }) => (
            <>
              <div className="relative">
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-msvideo,video/x-matroska"
                  className="input w-full"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    onChange(file || undefined)
                  }}
                  {...field}
                  value={undefined} // Reset value to allow re-selecting the same file
                />
              </div>
              {selectedVideo && selectedVideo instanceof File ? (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                  <p className="text-sm text-green-700 font-medium">
                    ✓ Selected: {selectedVideo.name} ({(selectedVideo.size / (1024 * 1024)).toFixed(2)} MB)
                  </p>
                </div>
              ) : (
                <p className="text-xs text-gray-400 mt-1">No file chosen</p>
              )}
              {fieldState.error && (
                <p className="text-red-500 text-xs mt-1">{String(fieldState.error.message)}</p>
              )}
            </>
          )}
        />
        {errors.video && (
          <p className="text-red-500 text-xs mt-1">{String(errors.video.message)}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          {isEditMode 
            ? 'Leave empty to keep existing video. Upload a new file to replace it.'
            : 'Optional: Upload a video file. Supported formats: MP4, WebM, OGG, MOV, AVI, MKV (Max 500MB)'}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          PDF File (Optional)
        </label>
        <Controller
          name="pdf"
          control={control}
          render={({ field: { onChange, value, ...field }, fieldState }) => (
            <>
              <div className="relative">
                <input
                  type="file"
                  accept="application/pdf"
                  className="input w-full"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    onChange(file || undefined)
                  }}
                  {...field}
                  value={undefined} // Reset value to allow re-selecting the same file
                />
              </div>
              {selectedPdf && selectedPdf instanceof File ? (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                  <p className="text-sm text-green-700 font-medium">
                    ✓ Selected: {selectedPdf.name} ({(selectedPdf.size / (1024 * 1024)).toFixed(2)} MB)
                  </p>
                </div>
              ) : (
                <p className="text-xs text-gray-400 mt-1">No file chosen</p>
              )}
              {fieldState.error && (
                <p className="text-red-500 text-xs mt-1">{String(fieldState.error.message)}</p>
              )}
            </>
          )}
        />
        {errors.pdf && <p className="text-red-500 text-xs mt-1">{String(errors.pdf.message)}</p>}
        <p className="text-xs text-gray-500 mt-1">
          {isEditMode 
            ? 'Leave empty to keep existing PDF. Upload a new file to replace it.'
            : 'Upload lecture materials or notes as PDF (Max 50MB)'}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Resource Link URL (Optional)
        </label>
        <input
          type="url"
          {...register('resource_link_url')}
          className="input w-full"
          placeholder="Enter an external resource link..."
        />
        {errors.resource_link_url && <p className="text-red-500 text-xs mt-1">{errors.resource_link_url.message}</p>}
        <p className="text-xs text-gray-500 mt-1">
          Enter a direct URL for an external resource (e.g., article, website, flashcard set, etc.)
        </p>
      </div>

      {/* Show error if neither video nor PDF is provided (for create mode only) */}
      {!isEditMode && !selectedVideo && !selectedPdf && !(resourceLinkUrl && resourceLinkUrl.trim().length > 0) && errors.video && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p className="text-sm">{String(errors.video.message) || 'At least one content source (video file, PDF file, or Resource Link URL) must be provided'}</p>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="btn btn-secondary"
          disabled={isLoading}
        >
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={isLoading}>
          {isLoading ? (isEditMode ? 'Updating...' : 'Uploading...') : (isEditMode ? 'Update Lecture' : 'Upload Lecture')}
        </button>
      </div>
    </form>
  )
}

