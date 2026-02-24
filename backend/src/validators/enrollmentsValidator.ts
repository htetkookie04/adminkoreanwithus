import { z } from 'zod';

/**
 * Validation schema for enrollment status
 */
export const enrollmentStatusSchema = z.enum([
  'pending',
  'approved',
  'active',
  'cancelled',
  'completed'
], {
  errorMap: () => ({ message: 'Status must be one of: pending, approved, active, cancelled, completed' })
});

/**
 * Validation schema for payment status
 */
export const paymentStatusSchema = z.enum([
  'unpaid',
  'paid',
  'refunded',
  'partial'
], {
  errorMap: () => ({ message: 'Payment status must be one of: unpaid, paid, refunded, partial' })
});

/**
 * Validation schema for creating an enrollment
 */
export const createEnrollmentSchema = z.object({
  userId: z.number()
    .int('User ID must be an integer')
    .positive('User ID must be positive')
    .optional(),
  userEmail: z.string()
    .email('Invalid email format')
    .toLowerCase()
    .trim()
    .optional(),
  courseId: z.number()
    .int('Course ID must be an integer')
    .positive('Course ID must be positive'),
  scheduleId: z.number()
    .int('Schedule ID must be an integer')
    .positive('Schedule ID must be positive')
    .optional()
    .nullable(),
  notes: z.string()
    .max(2000, 'Notes must be less than 2000 characters')
    .optional()
    .nullable(),
  source: z.string()
    .max(100, 'Source must be less than 100 characters')
    .optional()
}).refine(
  (data) => data.userId !== undefined || data.userEmail !== undefined,
  {
    message: 'Either userId or userEmail must be provided',
    path: ['userId']
  }
);

/**
 * Validation schema for updating an enrollment
 */
export const updateEnrollmentSchema = z.object({
  status: enrollmentStatusSchema.optional(),
  notes: z.string()
    .max(2000, 'Notes must be less than 2000 characters')
    .optional()
    .nullable(),
  paymentStatus: paymentStatusSchema.optional()
}).refine(
  (data) => Object.keys(data).length > 0,
  {
    message: 'At least one field must be provided for update'
  }
);

/**
 * Validation schema for enrollment ID parameter
 */
export const enrollmentIdParamSchema = z.object({
  id: z.string()
    .regex(/^\d+$/, 'Enrollment ID must be a positive integer')
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0, 'Enrollment ID must be positive')
});

/**
 * Validation schema for rejecting an enrollment
 */
export const rejectEnrollmentSchema = z.object({
  reason: z.string()
    .max(500, 'Reason must be less than 500 characters')
    .optional()
    .nullable()
});

