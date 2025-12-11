# PDF Download & Video Playback Fix

## Issues Fixed

### 1. ✅ PDF Download
**Problem**: PDF links were not downloading files.

**Solution**:
- Added `download` attribute to PDF links
- Configured proper Content-Type headers (`application/pdf`)
- Set Content-Disposition header for inline viewing
- Added CORS headers for cross-origin access

**Files Modified**:
- `backend/src/index.ts` - Static file serving with proper headers
- `frontend/src/pages/CourseLecturePage.tsx` - Added download attribute

### 2. ✅ Video Playback
**Problem**: Videos were not playing in the browser.

**Solution**:
- Configured Helmet to allow cross-origin resources
- Added proper CORS headers for video files
- Set Content-Type to `video/mp4`
- Added `Accept-Ranges` header for video streaming (range requests)
- Added `crossOrigin="anonymous"` to video element
- Added error handling with helpful messages
- Added fallback "Open in new tab" link

**Files Modified**:
- `backend/src/index.ts` - Static file serving with video headers
- `frontend/src/components/VideoPlayer.tsx` - Enhanced video player with error handling

## Technical Details

### Backend Static File Serving

The `/uploads` route now:
1. Sets CORS headers for cross-origin access
2. Detects file type (video/PDF) and sets appropriate Content-Type
3. Enables range requests for video streaming
4. Sets cache headers for performance
5. Serves files BEFORE authentication middleware (public access)

### Frontend Video Player

Enhanced with:
- Error handling and display
- Fallback download/open links
- Proper CORS configuration
- Support for video streaming

## Testing

### Test PDF Download
1. Go to a lecture with PDF
2. Click "Download PDF"
3. Should download or open in browser

### Test Video Playback
1. Go to a lecture with video
2. Click "Watch" button
3. Video should play in modal
4. If error, shows error message with fallback link

### Verify Files Exist
Check backend uploads directory:
```bash
ls backend/uploads/lectures/
```

Should see uploaded video and PDF files.

## Troubleshooting

### PDF Still Not Downloading?

1. **Check file exists**:
   ```bash
   ls backend/uploads/lectures/
   ```

2. **Check URL in browser console**:
   - Open browser DevTools → Network tab
   - Click PDF link
   - Check request URL and response headers

3. **Verify CORS**:
   - Check response headers include `Access-Control-Allow-Origin`
   - Should match your frontend URL

4. **Check Content-Type**:
   - Response should have `Content-Type: application/pdf`

### Video Still Not Playing?

1. **Check file exists**:
   ```bash
   ls backend/uploads/lectures/
   ```

2. **Check browser console**:
   - Look for CORS errors
   - Look for 404 errors
   - Check video element errors

3. **Test direct URL**:
   - Copy video URL from database
   - Open directly: `http://localhost:3001/uploads/lectures/filename.mp4`
   - Should play/download

4. **Check video format**:
   - Supported: MP4, WebM, OGG, MOV, AVI, MKV
   - Some browsers only support MP4

5. **Check file size**:
   - Large files may need range requests
   - Backend now supports range requests

### Common Issues

**Issue**: 404 Not Found
- **Cause**: File doesn't exist at path
- **Fix**: Check file exists in `backend/uploads/lectures/`
- **Fix**: Verify URL in database matches actual filename

**Issue**: CORS Error
- **Cause**: CORS headers not set correctly
- **Fix**: Check `CORS_ORIGIN` in `.env` matches frontend URL
- **Fix**: Verify static file middleware sets CORS headers

**Issue**: Video loads but doesn't play
- **Cause**: Video format not supported by browser
- **Fix**: Convert to MP4 format
- **Fix**: Check browser console for codec errors

**Issue**: PDF opens but doesn't download
- **Cause**: Browser default behavior
- **Fix**: Right-click → "Save As"
- **Fix**: Check `Content-Disposition` header is set

## File Paths

Files are stored at:
- Videos: `backend/uploads/lectures/{timestamp}-{random}.mp4`
- PDFs: `backend/uploads/lectures/{timestamp}-{random}.pdf`

URLs in database:
- Format: `/uploads/lectures/{filename}`
- Full URL: `http://localhost:3001/uploads/lectures/{filename}`

## Security Notes

- Files are served publicly (no authentication required)
- Consider adding authentication middleware if needed
- File names are sanitized to prevent directory traversal
- Only specific file types are allowed (video/PDF)

