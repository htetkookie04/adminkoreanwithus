# Timetable Time Update Test Guide

## Overview
This document provides a guide to test the timetable time update functionality after the fixes have been applied.

## Changes Made

### Frontend Changes
1. **`frontend/src/hooks/useTimetable.ts`**:
   - Modified `useUpdateTimetableEntry` to only send defined, non-empty fields
   - Added explicit checks for time values before including them in the request
   - Added debug logging to track data being sent

2. **`frontend/src/components/forms/TimetableForm.tsx`**:
   - Improved form reset logic to ensure time values are properly formatted
   - Added explicit `required` validation to time inputs
   - Added default time values when resetting the form

### Backend Changes
1. **`backend/src/controllers/timetableController.ts`**:
   - Enhanced validation to check for empty strings and null values
   - Improved time format validation before conversion
   - Added better error messages for invalid time formats
   - Added debug logging to track request processing

## Testing Steps

### Prerequisites
1. Ensure both backend and frontend servers are running:
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev

   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

2. Log in to the application as an admin user

### Test Case 1: Update Start Time Only
1. Navigate to the Timetable Management page
2. Click "Edit" on an existing timetable entry
3. Change only the **Start Time** (e.g., from "09:00" to "10:00")
4. Keep all other fields unchanged
5. Click "Save Entry"
6. **Expected Result**: 
   - Success message appears
   - The start time is updated in the table
   - The end time remains unchanged

### Test Case 2: Update End Time Only
1. Click "Edit" on a timetable entry
2. Change only the **End Time** (e.g., from "10:30" to "11:30")
3. Keep all other fields unchanged
4. Click "Save Entry"
5. **Expected Result**:
   - Success message appears
   - The end time is updated in the table
   - The start time remains unchanged

### Test Case 3: Update Both Times
1. Click "Edit" on a timetable entry
2. Change both **Start Time** and **End Time** (e.g., "14:00" to "16:00")
3. Click "Save Entry"
4. **Expected Result**:
   - Success message appears
   - Both times are updated in the table
   - The time range displays correctly

### Test Case 4: Verify Data Persistence
1. Update a timetable entry's times
2. Refresh the page
3. **Expected Result**:
   - The updated times persist after page refresh
   - The times are correctly displayed in the table

### Test Case 5: Validation - End Time Before Start Time
1. Click "Edit" on a timetable entry
2. Set **Start Time** to "15:00"
3. Set **End Time** to "14:00" (before start time)
4. Click "Save Entry"
5. **Expected Result**:
   - Error message: "End time must be after start time"
   - The form does not submit
   - No changes are saved

## Debugging

### Check Browser Console
When testing, check the browser console (F12) for debug logs:
- Look for `[Timetable Update] Sending update request:` - shows what data is being sent
- Look for `[Timetable Update] Update response:` - shows the server response

### Check Backend Logs
Check the backend terminal for debug logs:
- `[Timetable Update] Received request:` - shows what the backend received
- `[Timetable Update] Current entry:` - shows the current database values
- `[Timetable Update] Update data to be saved:` - shows what will be saved
- `[Timetable Update] Updated entry:` - shows the final saved values

### Network Tab
1. Open browser DevTools (F12)
2. Go to the Network tab
3. Filter for "timetable"
4. Edit a timetable entry and save
5. Click on the PUT request to `/timetable/{id}`
6. Check:
   - **Request Payload**: Should include `startTime` and/or `endTime` in "HH:MM" format
   - **Response**: Should return the updated entry with new times

## Common Issues and Solutions

### Issue: Times not updating
**Possible Causes:**
1. Time values not being sent in the request
   - **Check**: Network tab → Request Payload
   - **Solution**: Verify form is capturing time values correctly

2. Backend not processing time values
   - **Check**: Backend logs for validation errors
   - **Solution**: Verify time format is "HH:MM" (24-hour format)

3. Cache not invalidating
   - **Check**: Browser console for query invalidation
   - **Solution**: The `queryClient.invalidateQueries` should refresh the data

### Issue: Times reverting after save
**Possible Causes:**
1. Form resetting with old values
   - **Check**: Form initialization logic
   - **Solution**: Verify `convertTimeForForm` function is working correctly

2. Database not saving
   - **Check**: Backend logs for database errors
   - **Solution**: Verify Prisma update is successful

## Removing Debug Logs

After testing is complete, remove the debug `console.log` statements from:
- `frontend/src/hooks/useTimetable.ts` (lines with `console.log`)
- `backend/src/controllers/timetableController.ts` (lines with `console.log`)

## Success Criteria

✅ Times update correctly when changed
✅ Only changed fields are sent in the update request
✅ Times persist after page refresh
✅ Validation prevents invalid time ranges
✅ Error messages are clear and helpful
✅ No console errors or warnings

