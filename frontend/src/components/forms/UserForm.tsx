import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect, useState } from 'react'
import { useRoles } from '../../hooks/useRoles'

// Base schema - password can be empty string or min 6 chars
const baseUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  roleId: z.number().min(1, 'Role is required'),
  status: z.enum(['active', 'suspended', 'archived']).default('active')
})

// Create a function to generate schema based on edit mode
const createUserSchema = (isEditMode: boolean) => {
  return baseUserSchema.refine((data) => {
    // If creating new user, password is required and must be at least 6 characters
    if (!isEditMode) {
      if (!data.password || data.password.trim().length === 0) {
        return false
      }
      if (data.password.length < 6) {
        return false
      }
    } else {
      // If editing, password is optional, but if provided, must be at least 6 characters
      if (data.password && data.password.length > 0 && data.password.length < 6) {
        return false
      }
    }
    return true
  }, {
    message: isEditMode 
      ? 'Password must be at least 6 characters if provided' 
      : 'Password is required and must be at least 6 characters',
    path: ['password']
  })
}

// Export type will be inferred from the schema in the component
export type UserFormData = z.infer<typeof baseUserSchema>

interface UserFormProps {
  onSubmit: (data: UserFormData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
  initialData?: Partial<UserFormData>
}

export default function UserForm({ onSubmit, onCancel, isLoading, initialData }: UserFormProps) {
  const isEditMode = !!initialData
  const userSchema = createUserSchema(isEditMode)
  const { data: rolesData, isLoading: rolesLoading } = useRoles()
  const roles = rolesData?.data || []
  const [showPassword, setShowPassword] = useState(false)
  
  // Find user role ID for default
  const userRole = roles.find(r => r.name === 'user')
  const defaultRoleId = userRole?.id || 8

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: initialData?.email || '',
      password: '',
      firstName: initialData?.firstName || '',
      lastName: initialData?.lastName || '',
      phone: initialData?.phone || '',
      roleId: initialData?.roleId || defaultRoleId,
      status: initialData?.status || 'active'
    }
  })

  useEffect(() => {
    if (initialData) {
      reset(initialData)
    } else if (!rolesLoading && roles.length > 0 && !initialData) {
      // Update default roleId when roles are loaded
      const userRole = roles.find(r => r.name === 'user')
      const defaultRoleId = userRole?.id || 8
      reset({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        phone: '',
        roleId: defaultRoleId,
        status: 'active'
      })
    }
  }, [initialData, reset, rolesLoading, roles])

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          {...register('email')}
          className="input w-full"
          placeholder="user@example.com"
          disabled={isEditMode} // Email is view-only when editing an existing user
        />
        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Password {!initialData && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            {...register('password')}
            className="input w-full pr-10"
            placeholder={initialData ? 'Leave blank to keep current password' : 'Minimum 6 characters'}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
            tabIndex={-1}
          >
            {showPassword ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.736m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
        {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            First Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            {...register('firstName')}
            className="input w-full"
            placeholder="John"
          />
          {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Last Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            {...register('lastName')}
            className="input w-full"
            placeholder="Doe"
          />
          {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
        <input
          type="tel"
          {...register('phone')}
          className="input w-full"
          placeholder="+65 1234 5678"
        />
        {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Role <span className="text-red-500">*</span>
        </label>
        <select 
          {...register('roleId', { valueAsNumber: true })} 
          className="input w-full"
          disabled={rolesLoading}
        >
          {rolesLoading ? (
            <option>Loading roles...</option>
          ) : (
            roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name.charAt(0).toUpperCase() + role.name.slice(1).replace('_', ' ')}
              </option>
            ))
          )}
        </select>
        {errors.roleId && <p className="text-red-500 text-xs mt-1">{errors.roleId.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
        <select {...register('status')} className="input w-full">
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="archived">Archived</option>
        </select>
        {errors.status && <p className="text-red-500 text-xs mt-1">{errors.status.message}</p>}
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
          {isLoading ? 'Saving...' : 'Save User'}
        </button>
      </div>
    </form>
  )
}

