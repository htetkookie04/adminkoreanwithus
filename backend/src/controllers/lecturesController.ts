import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';

// Validation schemas
export const createLectureSchema = z.object({
  course_id: z.number().int().positive(),
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional(),
});

export const updateLectureSchema = z.object({
  course_id: z.number().int().positive().optional(),
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
});

// Configure multer for video uploads
const uploadDir = path.join(__dirname, '../../uploads/lectures');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const videoFileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = /mp4|webm|ogg|mov|avi|mkv/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = /video\//.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new AppError('Only video files are allowed (mp4, webm, ogg, mov, avi, mkv)', 400));
  }
};

const pdfFileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const extname = /pdf/.test(path.extname(file.originalname).toLowerCase());
  const mimetype = /application\/pdf/.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new AppError('Only PDF files are allowed', 400));
  }
};

// Multer for video uploads
export const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit for videos
  fileFilter: videoFileFilter
});

// Multer for PDF uploads
export const uploadPdf = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit for PDFs
  fileFilter: pdfFileFilter
});

// Multer for both video and PDF (fields)
export const uploadFiles = multer({
  storage,
  limits: { 
    fileSize: 500 * 1024 * 1024, // 500MB limit
    files: 2 // Max 2 files (video + pdf)
  },
  fileFilter: (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Check if it's a video file
    if (file.fieldname === 'video') {
      return videoFileFilter(req, file, cb);
    }
    // Check if it's a PDF file
    if (file.fieldname === 'pdf') {
      return pdfFileFilter(req, file, cb);
    }
    // Allow other fields (like form data)
    cb(null, false);
  }
});

// Helper function to check if student is enrolled in a course
const isStudentEnrolled = async (userId: number, courseId: number): Promise<boolean> => {
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      userId,
      courseId,
      status: 'active'
    }
  });
  return !!enrollment;
};

// GET /lectures - List lectures (role-based filtering)
export const getLectures = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { courseId, page = '1', per_page = '20' } = req.query;
    const user = req.user!;

    const limit = parseInt(per_page as string);
    const skip = (parseInt(page as string) - 1) * limit;

    // Build where clause
    const where: any = {};

    // Filter by course if specified
    if (courseId) {
      where.courseId = parseInt(courseId as string);
    }

    // Student: only show lectures for enrolled courses
    if (user.roleName === 'user' || user.roleName === 'student') {
      // Get enrolled course IDs
      const enrollments = await prisma.enrollment.findMany({
        where: {
          userId: user.id,
          status: 'active'
        },
        select: {
          courseId: true
        }
      });

      const enrolledCourseIds = enrollments.map(e => e.courseId).filter(Boolean) as number[];
      
      if (courseId) {
        // If filtering by course, check enrollment
        if (!enrolledCourseIds.includes(parseInt(courseId as string))) {
          throw new AppError('Access denied. You are not enrolled in this course.', 403);
        }
      } else {
        // Filter to only enrolled courses
        where.courseId = { in: enrolledCourseIds };
      }
    }
    // Teacher: only show their own lectures
    else if (user.roleName === 'teacher') {
      where.uploadedBy = user.id;
    }
    // Admin: show all (no additional filter)

    // Get lectures with relations
    const [lectures, total] = await Promise.all([
      prisma.lecture.findMany({
        where,
        include: {
          course: {
            select: {
              title: true,
              level: true
            }
          },
          uploader: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.lecture.count({ where })
    ]);

    // Format response
    const formattedLectures = lectures.map(lecture => ({
      id: lecture.id,
      course_id: lecture.courseId,
      title: lecture.title,
      description: lecture.description,
      video_url: lecture.videoUrl,
      pdf_url: lecture.pdfUrl,
      uploaded_by: lecture.uploadedBy,
      role_of_uploader: lecture.roleOfUploader,
      created_at: lecture.createdAt,
      updated_at: lecture.updatedAt,
      course_title: lecture.course.title,
      course_level: lecture.course.level,
      uploader_name: lecture.uploader 
        ? `${lecture.uploader.firstName} ${lecture.uploader.lastName}` 
        : null
    }));

    res.json({
      success: true,
      data: formattedLectures,
      pagination: {
        page: parseInt(page as string),
        per_page: limit,
        total,
        total_pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// GET /lectures/:id - Get single lecture
export const getLecture = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const lecture = await prisma.lecture.findUnique({
      where: { id: parseInt(id) },
      include: {
        course: {
          select: {
            title: true,
            level: true
          }
        },
        uploader: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!lecture) {
      throw new AppError('Lecture not found', 404);
    }

    // Check access permissions
    if (user.roleName === 'user' || user.roleName === 'student') {
      const isEnrolled = await isStudentEnrolled(user.id, lecture.courseId);
      if (!isEnrolled) {
        throw new AppError('Access denied', 403);
      }
    } else if (user.roleName === 'teacher') {
      if (lecture.uploadedBy !== user.id) {
        throw new AppError('Access denied', 403);
      }
    }

    // Format response
    const formattedLecture = {
      id: lecture.id,
      course_id: lecture.courseId,
      title: lecture.title,
      description: lecture.description,
      video_url: lecture.videoUrl,
      pdf_url: lecture.pdfUrl,
      uploaded_by: lecture.uploadedBy,
      role_of_uploader: lecture.roleOfUploader,
      created_at: lecture.createdAt,
      updated_at: lecture.updatedAt,
      course_title: lecture.course.title,
      course_level: lecture.course.level,
      uploader_name: lecture.uploader 
        ? `${lecture.uploader.firstName} ${lecture.uploader.lastName}` 
        : null
    };

    res.json({
      success: true,
      data: formattedLecture
    });
  } catch (error) {
    next(error);
  }
};

// POST /lectures - Create lecture (admin/teacher only)
export const createLecture = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const videoFile = files?.video?.[0];
    const pdfFile = files?.pdf?.[0];

    // At least one file (video or PDF) must be provided
    if (!videoFile && !pdfFile) {
      throw new AppError('At least one file (video or PDF) must be provided', 400);
    }

    const user = req.user!;
    const roleOfUploader = user.roleName === 'admin' || user.roleName === 'super_admin' ? 'admin' : 'teacher';

    // Validate request body
    const validatedData = createLectureSchema.parse({
      course_id: parseInt(req.body.course_id),
      title: req.body.title,
      description: req.body.description || null
    });

    // Verify course exists
    const course = await prisma.course.findUnique({
      where: { id: validatedData.course_id }
    });

    if (!course) {
      throw new AppError('Course not found', 404);
    }

    // Construct URLs
    const videoUrl = videoFile ? `/uploads/lectures/${videoFile.filename}` : null;
    const pdfUrl = pdfFile ? `/uploads/lectures/${pdfFile.filename}` : null;

    const lecture = await prisma.lecture.create({
      data: {
        courseId: validatedData.course_id,
        title: validatedData.title,
        description: validatedData.description,
        videoUrl,
        pdfUrl,
        uploadedBy: user.id,
        roleOfUploader
      }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'lecture.created',
        resourceType: 'lecture',
        resourceId: lecture.id
      }
    });

    // Format response
    const formattedLecture = {
      id: lecture.id,
      course_id: lecture.courseId,
      title: lecture.title,
      description: lecture.description,
      video_url: lecture.videoUrl,
      pdf_url: lecture.pdfUrl,
      uploaded_by: lecture.uploadedBy,
      role_of_uploader: lecture.roleOfUploader,
      created_at: lecture.createdAt,
      updated_at: lecture.updatedAt
    };

    res.status(201).json({
      success: true,
      data: formattedLecture
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400));
    }
    next(error);
  }
};

// PUT /lectures/:id - Update lecture (admin/teacher only)
export const updateLecture = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    // Validate request body
    const validatedData = updateLectureSchema.parse({
      course_id: req.body.course_id ? parseInt(req.body.course_id) : undefined,
      title: req.body.title,
      description: req.body.description
    });

    // Check if lecture exists and get current data
    const currentLecture = await prisma.lecture.findUnique({
      where: { id: parseInt(id) }
    });

    if (!currentLecture) {
      throw new AppError('Lecture not found', 404);
    }

    // Teacher can only edit their own lectures
    if (user.roleName === 'teacher' && currentLecture.uploadedBy !== user.id) {
      throw new AppError('Access denied', 403);
    }

    // Verify course exists if changing
    if (validatedData.course_id && validatedData.course_id !== currentLecture.courseId) {
      const course = await prisma.course.findUnique({
        where: { id: validatedData.course_id }
      });
      if (!course) {
        throw new AppError('Course not found', 404);
      }
    }

    // Build update data
    const updateData: any = {};

    if (validatedData.title !== undefined) updateData.title = validatedData.title;
    if (validatedData.description !== undefined) updateData.description = validatedData.description;
    if (validatedData.course_id !== undefined) updateData.courseId = validatedData.course_id;

    if (Object.keys(updateData).length === 0) {
      throw new AppError('No fields to update', 400);
    }

    const lecture = await prisma.lecture.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'lecture.updated',
        resourceType: 'lecture',
        resourceId: parseInt(id),
        meta: { changes: validatedData }
      }
    });

    // Format response
    const formattedLecture = {
      id: lecture.id,
      course_id: lecture.courseId,
      title: lecture.title,
      description: lecture.description,
      video_url: lecture.videoUrl,
      pdf_url: lecture.pdfUrl,
      uploaded_by: lecture.uploadedBy,
      role_of_uploader: lecture.roleOfUploader,
      created_at: lecture.createdAt,
      updated_at: lecture.updatedAt
    };

    res.json({
      success: true,
      data: formattedLecture
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400));
    }
    if (error.code === 'P2025') {
      // Prisma record not found
      throw new AppError('Lecture not found', 404);
    }
    next(error);
  }
};

// DELETE /lectures/:id - Delete lecture (admin only)
export const deleteLecture = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Get lecture to delete files
    const lecture = await prisma.lecture.findUnique({
      where: { id: parseInt(id) }
    });

    if (!lecture) {
      throw new AppError('Lecture not found', 404);
    }

    // Delete files from filesystem
    if (lecture.videoUrl) {
      const videoPath = path.join(__dirname, '../../', lecture.videoUrl);
      if (fs.existsSync(videoPath)) {
        fs.unlinkSync(videoPath);
      }
    }

    if (lecture.pdfUrl) {
      const pdfPath = path.join(__dirname, '../../', lecture.pdfUrl);
      if (fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath);
      }
    }

    // Delete from database
    await prisma.lecture.delete({
      where: { id: parseInt(id) }
    });

    // Log activity
    if (req.user?.id) {
      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          action: 'lecture.deleted',
          resourceType: 'lecture',
          resourceId: parseInt(id)
        }
      });
    }

    res.json({
      success: true,
      message: 'Lecture deleted successfully'
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      // Prisma record not found
      throw new AppError('Lecture not found', 404);
    }
    next(error);
  }
};

// GET /lectures/course/:courseId - Get lectures for a specific course
export const getLecturesByCourse = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { courseId } = req.params;
    const user = req.user!;

    // Check if student is enrolled (if student role)
    if (user.roleName === 'user' || user.roleName === 'student') {
      const isEnrolled = await isStudentEnrolled(user.id, parseInt(courseId));
      if (!isEnrolled) {
        throw new AppError('Access denied. You are not enrolled in this course.', 403);
      }
    }

    // For getLecturesByCourse, show all lectures for the course (all roles can see)
    // This is different from getLectures which filters by role
    const limit = parseInt((req.query.per_page as string) || '20');
    const skip = (parseInt((req.query.page as string) || '1') - 1) * limit;

    const [lectures, total] = await Promise.all([
      prisma.lecture.findMany({
        where: {
          courseId: parseInt(courseId)
        },
        include: {
          course: {
            select: {
              title: true,
              level: true
            }
          },
          uploader: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.lecture.count({
        where: {
          courseId: parseInt(courseId)
        }
      })
    ]);

    // Format response
    const formattedLectures = lectures.map(lecture => ({
      id: lecture.id,
      course_id: lecture.courseId,
      title: lecture.title,
      description: lecture.description,
      video_url: lecture.videoUrl,
      pdf_url: lecture.pdfUrl,
      uploaded_by: lecture.uploadedBy,
      role_of_uploader: lecture.roleOfUploader,
      created_at: lecture.createdAt,
      updated_at: lecture.updatedAt,
      course_title: lecture.course.title,
      course_level: lecture.course.level,
      uploader_name: lecture.uploader 
        ? `${lecture.uploader.firstName} ${lecture.uploader.lastName}` 
        : null
    }));

    res.json({
      success: true,
      data: formattedLectures,
      pagination: {
        page: parseInt((req.query.page as string) || '1'),
        per_page: limit,
        total,
        total_pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};
