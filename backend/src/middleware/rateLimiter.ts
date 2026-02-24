import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * General API rate limiter
 * Limits each IP to 100 requests per 15 minutes
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Use IP address from request
  keyGenerator: (req: Request): string => {
    // Try to get real IP from proxy headers
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded 
      ? (typeof forwarded === 'string' ? forwarded.split(',')[0] : forwarded[0])
      : req.ip || req.socket.remoteAddress || 'unknown';
    return ip;
  },
  // Skip rate limiting for super_admin in development (optional)
  skip: (req: Request) => {
    if (process.env.NODE_ENV === 'development' && (req as any).user?.roleName === 'super_admin') {
      return true;
    }
    return false;
  }
});

/**
 * Strict rate limiter for authentication endpoints
 * Limits each IP to 5 login attempts per 15 minutes
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per 15 minutes
  message: {
    success: false,
    message: 'Too many login attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  keyGenerator: (req: Request): string => {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded 
      ? (typeof forwarded === 'string' ? forwarded.split(',')[0] : forwarded[0])
      : req.ip || req.socket.remoteAddress || 'unknown';
    return ip;
  }
});

/**
 * Rate limiter for file upload endpoints
 * Limits each IP to 10 uploads per hour
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 uploads per hour
  message: {
    success: false,
    message: 'Too many file uploads, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded 
      ? (typeof forwarded === 'string' ? forwarded.split(',')[0] : forwarded[0])
      : req.ip || req.socket.remoteAddress || 'unknown';
    return ip;
  }
});

/**
 * Rate limiter for sensitive operations (password changes, role updates, etc.)
 * Limits each IP to 10 sensitive operations per hour
 */
export const sensitiveOperationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 operations per hour
  message: {
    success: false,
    message: 'Too many sensitive operations, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded 
      ? (typeof forwarded === 'string' ? forwarded.split(',')[0] : forwarded[0])
      : req.ip || req.socket.remoteAddress || 'unknown';
    return ip;
  }
});

/**
 * Rate limiter for public contact/inquiry form. Prevents spam and DoS.
 * Requires trust proxy to be set when behind reverse proxy.
 */
export const inquiryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 inquiries per 15 minutes per IP
  message: {
    success: false,
    message: 'Too many inquiries from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded 
      ? (typeof forwarded === 'string' ? forwarded.split(',')[0] : forwarded[0])
      : req.ip || req.socket.remoteAddress || 'unknown';
    return ip;
  }
});

