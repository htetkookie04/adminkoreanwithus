import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect } from 'react'

const courseSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
  description: z.string().optional(),
  level: z.enum(['Beginner', 'Intermediate', 'Advanced', 'TOPIK']).optional(),
  capacity: z.number().min(0, 'Capacity must be 0 or greater').default(0),
  price: z.number().min(0, 'Price must be 0 or greater').default(0),
  currency: z.string().default('MMK'),
  active: z.boolean().default(true)
})

export type CourseFormData = z.infer<typeof courseSchema>

interface CourseFormProps {
  onSubmit: (data: CourseFormData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
  initialData?: Partial<CourseFormData>
}

export default function CourseForm({ onSubmit, onCancel, isLoading, initialData }: CourseFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
    setValue
  } = useForm<CourseFormData>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      title: initialData?.title || '',
      slug: initialData?.slug || '',
      description: initialData?.description || '',
      level: initialData?.level || 'Beginner',
      capacity: initialData?.capacity || 0,
      price: initialData?.price || 0,
      currency: initialData?.currency || 'MMK',
      active: initialData?.active !== undefined ? initialData.active : true
    }
  })

  const title = watch('title')

  // Auto-generate slug from title
  useEffect(() => {
    if (title && !initialData?.slug) {
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
      setValue('slug', slug)
    }
  }, [title, setValue, initialData])

  useEffect(() => {
    if (initialData) {
      reset(initialData)
    }
  }, [initialData, reset])

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          {...register('title')}
          className="input w-full"
          placeholder="Korean Language Level 1"
        />
        {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Slug <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          {...register('slug')}
          className="input w-full"
          placeholder="korean-language-level-1"
        />
        <p className="text-xs text-gray-500 mt-1">URL-friendly identifier (auto-generated from title)</p>
        {errors.slug && <p className="text-red-500 text-xs mt-1">{errors.slug.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          {...register('description')}
          className="input w-full"
          rows={4}
          placeholder="Course description..."
        />
        {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
          <select {...register('level')} className="input w-full">
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
            <option value="TOPIK">TOPIK</option>
          </select>
          {errors.level && <p className="text-red-500 text-xs mt-1">{errors.level.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
          <div className="input w-full bg-gray-50">
            MMK
          </div>
          <input type="hidden" {...register('currency')} value="MMK" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
          <input
            type="number"
            {...register('capacity', { valueAsNumber: true })}
            className="input w-full"
            min="0"
            placeholder="0"
          />
          {errors.capacity && <p className="text-red-500 text-xs mt-1">{errors.capacity.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
          <input
            type="number"
            {...register('price', { valueAsNumber: true })}
            className="input w-full"
            min="0"
            step="0.01"
            placeholder="0.00"
          />
          {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price.message}</p>}
        </div>
      </div>

      <div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            {...register('active')}
            className="w-4 h-4 text-primary-600 rounded"
          />
          <span className="text-sm font-medium text-gray-700">Active (course is available)</span>
        </label>
        {errors.active && <p className="text-red-500 text-xs mt-1">{errors.active.message}</p>}
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
          {isLoading ? 'Saving...' : 'Save Course'}
        </button>
      </div>
    </form>
  )
}

