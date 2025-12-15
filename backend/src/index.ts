import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler';
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
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false
}));

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
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(null, true); // Allow all origins for now, can restrict later
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
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

// Error handling (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

