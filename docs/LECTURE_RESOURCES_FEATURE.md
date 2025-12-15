# Lecture Resources Viewing Feature

## Overview

This feature allows users to view uploaded lecture resources including videos, PDFs, and external links after upload. The implementation includes separate folder organization, enhanced UI components, and proper security measures.

## Backend Implementation

### File Storage Structure

Files are now organized in separate directories:
- **Videos**: `/backend/uploads/videos/`
- **PDFs**: `/backend/uploads/pdfs/`

### Multer Configuration

The multer configuration automatically routes files to the appropriate folder based on the field name:
- `video` field → `/uploads/videos/`
- `pdf` field → `/uploads/pdfs/`

**File naming**: `{timestamp}-{random}-{sanitized-original-name}`

### Static File Serving

Files are served via Express static middleware at `/uploads/*` with:
- CORS headers for cross-origin access
- Proper Content-Type headers (video/mp4, application/pdf)
- Accept-Ranges header for video streaming
- Cache headers for performance

### API Endpoints

#### GET /api/lectures/course/:courseId
Returns all lectures for a specific course.

**Response Example:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "course_id": 1,
      "title": "Introduction to Korean Alphabet",
      "description": "Learn the basics of Hangul",
      "video_url": "/uploads/videos/1234567890-987654321-intro.mp4",
      "pdf_url": "/uploads/pdfs/1234567890-987654321-notes.pdf",
      "resource_link_url": "https://example.com/resources",
      "uploaded_by": 1,
      "role_of_uploader": "admin",
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-01-15T10:00:00Z",
      "course_title": "Basic Korean",
      "course_level": "Beginner",
      "uploader_name": "John Doe"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 100,
    "total": 1,
    "total_pages": 1
  }
}
```

#### GET /api/courses/:courseId/lectures
Alternative endpoint (same functionality as above).

### Security

1. **File Path Validation**: Middleware validates file paths to prevent directory traversal attacks
2. **CORS Configuration**: Proper CORS headers for cross-origin file access
3. **Rate Limiting**: Optional rate limiting for file downloads (configurable)
4. **File Type Validation**: Only allowed file types are accepted during upload

## Frontend Implementation

### Components

#### LectureResourceViewer
A comprehensive component for displaying lecture resources.

**Features:**
- Video player with modal view
- PDF preview/download
- External link display
- Fallback for missing resources
- Clean card-based UI

**Usage:**
```tsx
<LectureResourceViewer
  videoUrl="/uploads/videos/video.mp4"
  pdfUrl="/uploads/pdfs/notes.pdf"
  resourceLink="https://example.com"
  title="Lecture Resources"
/>
```

#### LectureCard
A card component for displaying lecture information with resources.

**Features:**
- Lecture metadata (title, description, upload date)
- Integrated resource viewer
- Action buttons (Watch, Edit, Delete)
- Role-based permissions

**Usage:**
```tsx
<LectureCard
  lecture={lecture}
  canEdit={true}
  onEdit={handleEdit}
  onDelete={handleDelete}
  onWatch={handleWatch}
/>
```

### Video Player

The `VideoPlayer` component includes:
- HTML5 video player with controls
- Error handling with fallback options
- Download and open in new tab links
- Proper CORS configuration
- Support for video streaming (range requests)

### PDF Handling

PDFs can be:
- Viewed inline in browser
- Downloaded directly
- Opened in new tab

## File Paths

### Database Storage
- `video_url`: `/uploads/videos/{filename}`
- `pdf_url`: `/uploads/pdfs/{filename}`
- `resource_link_url`: Full external URL

### Full URLs
Frontend constructs full URLs using:
```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const fullUrl = url.startsWith('http') ? url : `${API_URL}${url}`
```

## Migration Notes

### Existing Files
If you have existing files in `/uploads/lectures/`, you may need to:
1. Move videos to `/uploads/videos/`
2. Move PDFs to `/uploads/pdfs/`
3. Update database paths accordingly

**Migration Script Example:**
```sql
-- Update video URLs
UPDATE lectures 
SET video_url = REPLACE(video_url, '/uploads/lectures/', '/uploads/videos/')
WHERE video_url LIKE '/uploads/lectures/%';

-- Update PDF URLs
UPDATE lectures 
SET pdf_url = REPLACE(pdf_url, '/uploads/lectures/', '/uploads/pdfs/')
WHERE pdf_url LIKE '/uploads/lectures/%';
```

## Best Practices

### Security
1. **File Validation**: Always validate file types and sizes on both client and server
2. **Path Sanitization**: Sanitize filenames to prevent injection attacks
3. **Access Control**: Consider adding authentication middleware for sensitive files
4. **Rate Limiting**: Implement rate limiting for file downloads
5. **Virus Scanning**: Consider adding virus scanning for uploaded files

### Performance
1. **CDN**: Use CDN for serving static files in production
2. **Caching**: Leverage browser caching with proper cache headers
3. **Compression**: Compress videos and PDFs when possible
4. **Lazy Loading**: Lazy load video players and PDF previews

### User Experience
1. **Loading States**: Show loading indicators while resources load
2. **Error Handling**: Provide clear error messages and fallback options
3. **Progressive Enhancement**: Ensure basic functionality works without JavaScript
4. **Mobile Support**: Test video playback and PDF viewing on mobile devices

## Testing

### Manual Testing Checklist
- [ ] Upload video file and verify it's saved to `/uploads/videos/`
- [ ] Upload PDF file and verify it's saved to `/uploads/pdfs/`
- [ ] Verify video playback in browser
- [ ] Verify PDF download and preview
- [ ] Test external link opening
- [ ] Verify CORS headers for cross-origin access
- [ ] Test error handling for missing files
- [ ] Verify file path validation prevents directory traversal

### API Testing
```bash
# Get lectures for a course
curl -X GET "http://localhost:3001/api/lectures/course/1" \
  -H "Authorization: Bearer {token}"

# Access video file
curl -X GET "http://localhost:3001/uploads/videos/video.mp4" \
  -H "Range: bytes=0-1023"

# Access PDF file
curl -X GET "http://localhost:3001/uploads/pdfs/notes.pdf"
```

## Troubleshooting

### Video Not Playing
- Check CORS headers are set correctly
- Verify `Accept-Ranges` header is present
- Check video file format is supported
- Verify file path is correct

### PDF Not Downloading
- Check `Content-Disposition` header
- Verify PDF file exists
- Check file permissions

### 404 Errors
- Verify file paths in database match actual file locations
- Check folder structure exists
- Verify static file serving middleware is configured

## Future Enhancements

1. **Cloud Storage**: Migrate to S3/CloudFront for better scalability
2. **Video Transcoding**: Automatic video format conversion
3. **Thumbnail Generation**: Auto-generate video thumbnails
4. **Progress Tracking**: Track video watch progress
5. **Annotations**: Allow annotations on PDFs
6. **Search**: Full-text search within PDFs

