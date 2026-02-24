import { z } from 'zod';

/**
 * Validation schema for creating a user
 */
export const createUserSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email must be less than 255 characters')
    .toLowerCase()
    .trim(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  firstName: z.string()
    .max(100, 'First name must be less than 100 characters')
    .optional()
    .nullable(),
  lastName: z.string()
    .max(100, 'Last name must be less than 100 characters')
    .optional()
    .nullable(),
  phone: z.string()
    .max(20, 'Phone number must be less than 20 characters')
    .regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/, 'Invalid phone number format')
    .optional()
    .nullable(),
  roleId: z.number()
    .int('Role ID must be an integer')
    .positive('Role ID must be positive'),
  status: z.enum(['active', 'suspended', 'archived'], {
    errorMap: () => ({ message: 'Status must be one of: active, suspended, archived' })
  }).optional()
});

/**
 * Validation schema for updating a user
 */
export const updateUserSchema = z.object({
  firstName: z.string()
    .max(100, 'First name must be less than 100 characters')
    .optional()
    .nullable(),
  lastName: z.string()
    .max(100, 'Last name must be less than 100 characters')
    .optional()
    .nullable(),
  phone: z.string()
    .max(20, 'Phone number must be less than 20 characters')
    .regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/, 'Invalid phone number format')
    .optional()
    .nullable(),
  roleId: z.number()
    .int('Role ID must be an integer')
    .positive('Role ID must be positive')
    .optional(),
  status: z.enum(['active', 'suspended', 'archived'], {
    errorMap: () => ({ message: 'Status must be one of: active, suspended, archived' })
  }).optional()
}).refine(
  (data) => Object.keys(data).length > 0,
  {
    message: 'At least one field must be provided for update'
  }
);

/**
 * Validation schema for changing password
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string()
    .min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
}).refine(
  (data) => data.currentPassword !== data.newPassword,
  {
    message: 'New password must be different from current password',
    path: ['newPassword']
  }
);

/**
 * Validation schema for user ID parameter
 */
export const userIdParamSchema = z.object({
  id: z.string()
    .regex(/^\d+$/, 'User ID must be a positive integer')
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0, 'User ID must be positive')
});

