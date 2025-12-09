import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const galleryUploadSchema = z.object({
  image: z.instanceof(FileList).refine((files) => files.length > 0, 'Image is required'),
  caption: z.string().optional()
})

export type GalleryUploadFormData = z.infer<typeof galleryUploadSchema>

interface GalleryUploadFormProps {
  onSubmit: (data: { file: File; caption?: string }) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export default function GalleryUploadForm({ onSubmit, onCancel, isLoading }: GalleryUploadFormProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset
  } = useForm<GalleryUploadFormData>({
    resolver: zodResolver(galleryUploadSchema)
  })

  const imageFile = watch('image')

  // Create preview when image is selected
  if (imageFile && imageFile.length > 0 && !preview) {
    const file = imageFile[0]
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleFormSubmit = async (data: GalleryUploadFormData) => {
    const file = data.image[0]
    await onSubmit({ file, caption: data.caption })
    reset()
    setPreview(null)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Image <span className="text-red-500">*</span>
        </label>
        <input
          type="file"
          accept="image/*"
          {...register('image', {
            onChange: () => setPreview(null) // Reset preview when file changes
          })}
          className="input w-full"
        />
        {errors.image && <p className="text-red-500 text-xs mt-1">{errors.image.message}</p>}
        <p className="text-xs text-gray-500 mt-1">Max file size: 5MB. Supported formats: JPEG, PNG, GIF, WebP</p>
      </div>

      {preview && (
        <div className="mt-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
          <img
            src={preview}
            alt="Preview"
            className="max-w-full h-48 object-cover rounded-lg border border-gray-200"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Caption (Optional)</label>
        <textarea
          {...register('caption')}
          className="input w-full"
          rows={3}
          placeholder="Add a caption for this image..."
        />
        {errors.caption && <p className="text-red-500 text-xs mt-1">{errors.caption.message}</p>}
      </div>

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
          {isLoading ? 'Uploading...' : 'Upload Image'}
        </button>
      </div>
    </form>
  )
}

