# Record Lecture Feature - Implementation Guide

## Overview

The "Record Lecture" feature allows admins and teachers to upload recorded lectures, and students to view lectures from courses they are enrolled in.

## Database Schema

### Migration File
- **Location**: `database/migrations/004_lectures_schema.sql`
- **Table**: `lectures`
- **Fields**:
  - `id` (SERIAL PRIMARY KEY)
  - `course_id` (INT, FK → courses)
  - `title` (TEXT, NOT NULL)
  - `description` (TEXT, nullable)
  - `video_url` (TEXT, NOT NULL)
  - `uploaded_by` (INT, FK → users)
  - `role_of_uploader` (TEXT, CHECK: 'admin' or 'teacher')
  - `created_at` (TIMESTAMP WITH TIME ZONE)
  - `updated_at` (TIMESTAMP WITH TIME ZONE)

### Indexes
- `lectures_course_idx` on `course_id`
- `lectures_uploaded_by_idx` on `uploaded_by`
- `lectures_created_at_idx` on `created_at`

### Running Migration
```bash
psql -d korean_with_us -f database/migrations/004_lectures_schema.sql
```

## Backend Implementation

### Files Created/Modified

1. **Controller**: `backend/src/controllers/lecturesController.ts`
   - Handles CRUD operations for lectures
   - Implements file upload using Multer
   - Role-based access control
   - Student enrollment verification

2. **Routes**: `backend/src/routes/lectures.ts`
   - GET `/api/lectures` - List lectures (role-based filtering)
   - GET `/api/lectures/course/:courseId` - Get lectures for a course
   - GET `/api/lectures/:id` - Get single lecture
   - POST `/api/lectures` - Create lecture (admin/teacher only)
   - PUT `/api/lectures/:id` - Update lecture (admin/teacher only)
   - DELETE `/api/lectures/:id` - Delete lecture (admin only)

3. **Server Registration**: `backend/src/index.ts`
   - Added lectures router registration

### Access Control

- **Admin/Super Admin**:
  - Can upload/edit/delete all lectures
  - Can view all lectures

- **Teacher**:
  - Can upload lectures
  - Can edit/delete only their own lectures
  - Can view only their own lectures

- **Student (user role)**:
  - Can view only lectures for courses they are enrolled in
  - Enrollment status must be 'active'

### File Upload

- **Storage**: `backend/uploads/lectures/`
- **Max File Size**: 500MB
- **Supported Formats**: MP4, WebM, OGG, MOV, AVI, MKV
- **File Naming**: `{timestamp}-{random}.{ext}`

### Validation

- Uses Zod schemas for request validation
- `createLectureSchema`: Requires course_id, title, video file
- `updateLectureSchema`: Optional fields (video not required for updates)

## Frontend Implementation

### Files Created

1. **React Query Hooks**: `frontend/src/hooks/useLectures.ts`
   - `useLectures()` - List lectures
   - `useLecture(id)` - Get single lecture
   - `useLecturesByCourse(courseId)` - Get lectures for a course
   - `useCreateLecture()` - Upload lecture
   - `useUpdateLecture()` - Update lecture
   - `useDeleteLecture()` - Delete lecture

2. **Form Component**: `frontend/src/components/forms/UploadLectureForm.tsx`
   - React Hook Form + Zod validation
   - Course dropdown
   - Title and description fields
   - Video file upload (required for create, optional for edit)

3. **Video Player**: `frontend/src/components/VideoPlayer.tsx`
   - HTML5 video player
   - Handles relative and absolute URLs

4. **Admin/Teacher Page**: `frontend/src/pages/Lectures.tsx`
   - Table view of all lectures
   - Upload/Edit/Delete functionality
   - Role-based action buttons

5. **Student Page**: `frontend/src/pages/MyLectures.tsx`
   - Course selection sidebar
   - Lectures list for selected course
   - Video player for viewing lectures

### Routes Added

- `/lectures` - Admin/Teacher lectures management
- `/my-lectures` - Student lecture viewing

### Navigation Updates

- **Layout**: `frontend/src/components/Layout.tsx`
  - Admin/Teacher: "Lectures" menu item
  - Student: "My Lectures" menu item

## API Endpoints

### GET /api/lectures
**Query Parameters**:
- `courseId` (optional) - Filter by course
- `page` (optional) - Page number
- `per_page` (optional) - Items per page

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "course_id": 1,
      "title": "Introduction to Korean Alphabet",
      "description": "Basic Korean alphabet lesson",
      "video_url": "/uploads/lectures/1234567890-123456789.mp4",
      "uploaded_by": 2,
      "role_of_uploader": "teacher",
      "created_at": "2024-01-15T10:00:00Z",
      "course_title": "Korean Beginner Course",
      "course_level": "Beginner"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 1,
    "total_pages": 1
  }
}
```

### POST /api/lectures
**Content-Type**: `multipart/form-data`

**Form Data**:
- `course_id` (number, required)
- `title` (string, required, max 255 chars)
- `description` (string, optional)
- `video` (file, required, max 500MB)

**Response**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "course_id": 1,
    "title": "Introduction to Korean Alphabet",
    "description": "Basic Korean alphabet lesson",
    "video_url": "/uploads/lectures/1234567890-123456789.mp4",
    "uploaded_by": 2,
    "role_of_uploader": "teacher",
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-15T10:00:00Z"
  }
}
```

### PUT /api/lectures/:id
**Body**:
```json
{
  "course_id": 1,
  "title": "Updated Title",
  "description": "Updated description"
}
```

### DELETE /api/lectures/:id
**Response**:
```json
{
  "success": true,
  "message": "Lecture deleted successfully"
}
```

## Usage Examples

### Admin Uploading a Lecture

1. Navigate to `/lectures`
2. Click "+ Upload Lecture"
3. Select course from dropdown
4. Enter title and description
5. Choose video file (max 500MB)
6. Click "Upload Lecture"

### Teacher Editing Their Lecture

1. Navigate to `/lectures`
2. Find lecture in table
3. Click "Edit"
4. Update title/description/course
5. Click "Update Lecture"

### Student Viewing Lectures

1. Navigate to `/my-lectures`
2. Select a course from sidebar
3. View list of available lectures
4. Click a lecture to watch video

## Security Considerations

1. **File Upload Validation**:
   - File type checking (MIME type + extension)
   - File size limit (500MB)
   - Secure file naming

2. **Access Control**:
   - JWT authentication required
   - Role-based route protection
   - Student enrollment verification

3. **File Storage**:
   - Files stored in `backend/uploads/lectures/`
   - Consider moving to cloud storage (S3, Cloudinary) in production

## Future Enhancements

1. **Video Processing**:
   - Transcoding to multiple formats
   - Thumbnail generation
   - Video compression

2. **Features**:
   - Video playback progress tracking
   - Lecture notes/transcripts
   - Download option for students
   - Lecture duration display

3. **Performance**:
   - Video streaming (HLS/DASH)
   - CDN integration
   - Caching strategies

## Testing

### Backend Testing
```bash
# Test lecture creation
curl -X POST http://localhost:3001/api/lectures \
  -H "Authorization: Bearer {token}" \
  -F "course_id=1" \
  -F "title=Test Lecture" \
  -F "video=@test-video.mp4"

# Test lecture listing
curl -X GET http://localhost:3001/api/lectures \
  -H "Authorization: Bearer {token}"
```

### Frontend Testing
1. Login as admin/teacher
2. Navigate to Lectures page
3. Upload a test video
4. Verify video appears in list
5. Login as student
6. Navigate to My Lectures
7. Verify only enrolled course lectures are visible

## Troubleshooting

### Video Not Playing
- Check video URL is accessible
- Verify CORS settings
- Check file permissions

### Upload Fails
- Verify file size < 500MB
- Check file format is supported
- Verify course exists
- Check user permissions

### Student Can't See Lectures
- Verify student is enrolled in course
- Check enrollment status is 'active'
- Verify course_id matches enrollment

