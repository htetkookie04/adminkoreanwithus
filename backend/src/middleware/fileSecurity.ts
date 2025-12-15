import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';

/**
 * Security middleware for file access
 * Prevents directory traversal attacks and validates file paths
 */
export const validateFilePath = (req: Request, res: Response, next: NextFunction) => {
  const requestedPath = req.path;
  
  // Normalize the path to prevent directory traversal
  const normalizedPath = path.normalize(requestedPath).replace(/^(\.\.[\/\\])+/, '');
  
  // Only allow access to specific directories
  const allowedDirs = ['/videos/', '/pdfs/', '/lectures/', '/gallery/'];
  const isAllowed = allowedDirs.some(dir => normalizedPath.startsWith(dir));
  
  if (!isAllowed) {
    return res.status(403).json({
      success: false,
      message: 'Access denied to this file path'
    });
  }
  
  // Check if file exists (optional - can be removed for performance)
  const fullPath = path.join(__dirname, '../../uploads', normalizedPath);
  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({
      success: false,
      message: 'File not found'
    });
  }
  
  next();
};

/**
 * Rate limiting for file downloads (optional)
 * Can be enhanced with redis or memory store
 */
const downloadCounts = new Map<string, { count: number; resetTime: number }>();

export const rateLimitDownloads = (maxDownloads: number = 100, windowMs: number = 60000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientId = req.ip || 'unknown';
    const now = Date.now();
    
    const record = downloadCounts.get(clientId);
    
    if (!record || now > record.resetTime) {
      downloadCounts.set(clientId, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    if (record.count >= maxDownloads) {
      return res.status(429).json({
        success: false,
        message: 'Too many download requests. Please try again later.'
      });
    }
    
    record.count++;
    next();
  };
};

