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

  // Unexpected errors
  console.error('Unexpected error:', err);
  console.error('Error stack:', err.stack);
  const errorMessage = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message || 'An unexpected error occurred';
  
  res.status(500).json({
    success: false,
    message: errorMessage,
    error: {
      message: errorMessage,
      statusCode: 500
    }
  });
};

