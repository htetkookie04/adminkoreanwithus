import { Request, Response, NextFunction } from 'express';
import multer from 'multer';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Handle Multer errors
  if (err instanceof multer.MulterError) {
    let message = 'File upload error';
    let statusCode = 400;

    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'File size too large. Maximum size is 500MB for videos and 50MB for PDFs.';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files uploaded. Maximum is 2 files (video and PDF).';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected file field. Only "video" and "pdf" fields are allowed.';
        break;
      default:
        message = err.message || 'File upload error';
    }

    return res.status(statusCode).json({
      success: false,
      message: message,
      error: {
        message: message,
        statusCode: statusCode
      }
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      error: {
        message: err.message,
        statusCode: err.statusCode
      }
    });
  }

  // Unexpected errors - Enhanced logging
  console.error('═══════════════════════════════════════════════════════');
  console.error('❌ UNEXPECTED ERROR:', err.message || 'Unknown error');
  console.error('📍 Error Type:', err.constructor.name);
  console.error('📍 Error Code:', (err as any).code || 'N/A');
  console.error('📍 Request URL:', req.originalUrl);
  console.error('📍 Request Method:', req.method);
  console.error('📍 Request Params:', req.params);
  console.error('📍 Request Query:', req.query);
  console.error('📍 User ID:', (req as any).user?.id || 'Not authenticated');
  console.error('📍 Stack Trace:');
  console.error(err.stack || 'No stack trace available');
  console.error('═══════════════════════════════════════════════════════');
  
  // Check for common error types
  let errorMessage = 'Internal server error';
  let statusCode = 500;
  
  if (process.env.NODE_ENV !== 'production') {
    // In development, show detailed error
    errorMessage = err.message || 'An unexpected error occurred';
    
    // Check for Prisma errors
    if ((err as any).code?.startsWith('P')) {
      errorMessage = `Database error: ${err.message}`;
      console.error('🔍 Prisma Error Code:', (err as any).code);
    }
    
    // Check for database connection errors
    if (err.message?.includes('connect') || err.message?.includes('ECONNREFUSED')) {
      errorMessage = 'Database connection failed. Check DATABASE_URL and ensure PostgreSQL is running.';
      console.error('🔍 Database Connection Error Detected');
    }
  }
  
  res.status(statusCode).json({
    success: false,
    message: errorMessage,
    error: {
      message: errorMessage,
      statusCode: statusCode,
      ...(process.env.NODE_ENV !== 'production' && {
        type: err.constructor.name,
        code: (err as any).code,
        stack: err.stack
      })
    }
  });
};

