import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler';
import { apiLimiter, authLimiter, uploadLimiter } from './middleware/rateLimiter';
import { authRouter } from './routes/auth';
import { usersRouter } from './routes/users';
import { coursesRouter } from './routes/courses';
import { enrollmentsRouter } from './routes/enrollments';
import { inquiriesRouter } from './routes/inquiries';
import { reportsRouter } from './routes/reports';
import { settingsRouter } from './routes/settings';
import { timetableRouter } from './routes/timetable';
import { galleryRouter } from './routes/gallery';
import { lecturesRouter } from './routes/lectures';
import { analyticsRouter } from './routes/analytics';
import { rolesRouter } from './routes/roles';
import { menuPermissionsRouter } from './routes/menuPermissions';
import { v1Router } from './routes/v1';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// SECURITY: Trust first proxy so req.ip and rate limiters use client IP when behind reverse proxy.
// Set to 2 if behind two proxies (e.g. load balancer + app server). Never trust arbitrary X-Forwarded-For without this.
app.set('trust proxy', 1);

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  }
}));

// SECURITY: Apply rate limiting globally
app.use('/api', apiLimiter);

// CORS configuration - allow multiple origins
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://adminkoreanwithus.netlify.app',
  process.env.CORS_ORIGIN
].filter(Boolean);

// CORS configuration
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // SECURITY FIX: In production, require origin
    if (!origin) {
      // Allow requests with no origin only in development (mobile apps, Postman, etc.)
      if (process.env.NODE_ENV === 'development') {
        return callback(null, true);
      }
      return callback(new Error('CORS: Origin required in production'), false);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.error('CORS blocked origin:', origin);
      // SECURITY FIX: Don't allow all origins - reject unauthorized origins
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['RateLimit-Remaining', 'RateLimit-Reset'],
  maxAge: 86400, // 24 hours - cache preflight requests
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// Explicitly handle OPTIONS requests for all routes (important for preflight)
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Serve static files for uploads - MUST be before API routes
// This allows direct access to uploaded files without authentication
app.use('/uploads', (req, res, next) => {
  // Set CORS headers for static files
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  
  // Set proper content-type headers
  if (req.path.match(/\.(mp4|webm|ogg|mov|avi|mkv)$/i)) {
    res.type('video/mp4');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
  } else if (req.path.match(/\.pdf$/i)) {
    res.type('application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(req.path)}"`);
    res.setHeader('Cache-Control', 'public, max-age=31536000');
  }
  
  next();
}, express.static(path.join(__dirname, '../uploads'), {
  setHeaders: (res, filePath) => {
    // Additional headers for video streaming
    if (filePath.match(/\.(mp4|webm|ogg|mov|avi|mkv)$/i)) {
      res.setHeader('Accept-Ranges', 'bytes');
    }
  }
}));

// Handle 404 for missing upload files gracefully
app.use('/uploads', (req, res) => {
  console.error(`File not found: ${req.path}`);
  res.status(404).json({ 
    success: false, 
    message: 'File not found',
    path: req.path 
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Korean With Us Admin API',
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/courses', coursesRouter);
app.use('/api/enrollments', enrollmentsRouter);
app.use('/api/inquiries', inquiriesRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/timetable', timetableRouter);
app.use('/api/gallery', galleryRouter);
app.use('/api/lectures', lecturesRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/roles', rolesRouter);
app.use('/api/menu-permissions', menuPermissionsRouter);
app.use('/api/v1', v1Router);

// Error handling (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

