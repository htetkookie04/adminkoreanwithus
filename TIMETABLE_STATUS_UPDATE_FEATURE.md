# Timetable Status Update Feature for Teachers

## Overview
This feature allows Teachers to update the status of their timetable entries directly from the Timetable Management page. Admins can view all changes in real-time.

## Features Implemented

### ✅ Backend Changes

#### 1. New Controller Method: `updateTimetableStatus`
**File:** `backend/src/controllers/timetableController.ts`

**Functionality:**
- Dedicated endpoint for status-only updates
- Validates status values (active, cancelled, completed)
- Teachers can only update their own timetable entries
- Admins can update any timetable entry
- Logs all status changes in activity log
- Returns updated entry with new status

**Authorization Logic:**
```typescript
// For teachers, verify they own this timetable entry
if (user.roleName === 'teacher') {
  // Match teacher's full name with timetable entry
  if (currentEntry.teacherName !== teacherFullName) {
    throw new AppError('You can only update status for your own timetable entries', 403);
  }
}
```

#### 2. New API Route
**File:** `backend/src/routes/timetable.ts`

**Endpoint:** `PATCH /api/timetable/:id/status`

**Access:**
- Teachers: Can update their own entries
- Admins: Can update any entry
- Requires authentication

**Request Body:**
```json
{
  "status": "active" | "cancelled" | "completed"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "course_name": "Korean Basic",
    "status": "cancelled",
    "updated_at": "2026-01-12T10:30:00.000Z",
    ...
  },
  "message": "Status updated successfully"
}
```

### ✅ Frontend Changes

#### 1. New Hook: `useUpdateTimetableStatus`
**File:** `frontend/src/features/schedule/hooks/useTimetable.ts`

**Functionality:**
- React Query mutation for status updates
- Optimistic UI updates (immediate feedback)
- Automatic cache invalidation
- Toast notifications
- Error handling

**Usage:**
```typescript
const updateStatusMutation = useUpdateTimetableStatus()

await updateStatusMutation.mutateAsync({ 
  id: entryId, 
  status: newStatus 
})
```

#### 2. Updated Timetable Component
**File:** `frontend/src/features/schedule/pages/Timetable.tsx`

**Changes:**
1. **Modern Icons**: Added Lucide React icons (Edit, Trash2, Calendar, Clock, User)
2. **Pink Theme**: Updated to match the app's pink color scheme
3. **Loading Spinner**: Pink-themed animated spinner
4. **Enhanced Table Styling**: Better hover effects and spacing

**Status Dropdown for Teachers:**
```tsx
<select
  value={entry.status}
  onChange={(e) => handleStatusChange(entry.id, e.target.value)}
  disabled={updateStatusMutation.isPending}
  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border-2 transition-all cursor-pointer ${
    entry.status === 'active'
      ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
      : entry.status === 'cancelled'
      ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
  }`}
>
  <option value="active">Active</option>
  <option value="cancelled">Cancelled</option>
  <option value="completed">Completed</option>
</select>
```

## UI Design

### For Teachers
- **Status Column**: Interactive dropdown with color-coded options
- **Actions Column**: Shows "View only" text
- **Status Colors**:
  - 🟢 **Active**: Green background (bg-green-50, text-green-700)
  - 🔴 **Cancelled**: Red background (bg-red-50, text-red-700)
  - ⚪ **Completed**: Gray background (bg-gray-50, text-gray-700)

### For Admins
- **Status Column**: Read-only badge display
- **Actions Column**: Edit and Delete icon buttons
- Full CRUD access to all entries

## User Flow

### Teacher Workflow
1. Teacher logs in and navigates to Timetable
2. Sees only their assigned classes
3. For each class, can change status via dropdown:
   - **Active** → Class is scheduled and running
   - **Cancelled** → Class is cancelled (weather, emergency, etc.)
   - **Completed** → Class has finished
4. Status updates immediately with visual feedback
5. Success toast notification appears

### Admin Workflow
1. Admin views all timetable entries
2. Sees current status of all classes (including teacher updates)
3. Can edit full entry details if needed
4. Can delete entries
5. All teacher status changes are visible in real-time

## Status Badge Colors

```typescript
const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800'    // Active classes
    case 'cancelled':
      return 'bg-red-100 text-red-800'        // Cancelled classes
    case 'completed':
      return 'bg-gray-100 text-gray-800'      // Completed classes
    default:
      return 'bg-gray-100 text-gray-800'
  }
}
```

## Security Features

1. **Authentication Required**: All endpoints require valid JWT token
2. **Role-Based Access**:
   - Teachers: View + Update status (own entries only)
   - Admins: Full CRUD access
3. **Ownership Validation**: Teachers cannot modify other teachers' entries
4. **Activity Logging**: All status changes logged with user ID and timestamp

## Database Activity Log

Each status update creates an activity log entry:
```typescript
{
  userId: user.id,
  action: 'timetable.status_updated',
  resourceType: 'timetable',
  resourceId: entryId,
  meta: { 
    oldStatus: 'active',
    newStatus: 'cancelled' 
  }
}
```

## API Error Handling

**Validation Errors:**
- Invalid status value → 400 Bad Request
- Missing status field → 400 Bad Request
- Entry not found → 404 Not Found
- Unauthorized access → 403 Forbidden

**Error Messages:**
- "Invalid status. Must be one of: active, cancelled, completed"
- "Timetable entry not found"
- "You can only update status for your own timetable entries"

## Frontend State Management

### Optimistic Updates
The UI updates immediately before server confirmation:
```typescript
queryClient.setQueriesData({ queryKey: ['timetable'] }, (oldData: any) => {
  // Update cache with new status
  return {
    ...oldData,
    data: oldData.data.map((entry: TimetableEntry) => 
      entry.id === updatedEntry.id ? {
        ...entry,
        status: updatedEntry.status
      } : entry
    )
  }
})
```

### Cache Invalidation
After successful update, all timetable queries are refetched:
```typescript
queryClient.invalidateQueries({ queryKey: ['timetable'] })
```

## Testing the Feature

### As Teacher:
1. Login with teacher credentials
2. Go to Timetable Management
3. Find your class entry
4. Click status dropdown
5. Select new status (Active/Cancelled/Completed)
6. Verify badge color changes immediately
7. Verify success toast appears

### As Admin:
1. Login with admin credentials
2. Go to Timetable Management
3. See all entries with their current status
4. Verify teacher status updates appear in real-time
5. Check status badges display correct colors

### Status Change Examples:
- **Active → Cancelled**: Class cancelled due to weather
- **Active → Completed**: Class finished for the day
- **Cancelled → Active**: Class rescheduled
- **Completed → Active**: Class recurring next week

## Performance Optimizations

1. **Debouncing**: Status changes are instant (no debounce needed)
2. **Optimistic UI**: Immediate visual feedback
3. **Selective Updates**: Only status field is updated (not full entry)
4. **Cache Strategy**: React Query handles caching and synchronization

## Accessibility

- Dropdown is keyboard accessible (Tab, Arrow keys, Enter)
- Color-coded with text labels (not color-only)
- Disabled state shows loading feedback
- ARIA labels for screen readers

## Mobile Responsiveness

- Dropdown works on touch devices
- Table scrolls horizontally on small screens
- Status colors visible on all screen sizes

## Files Modified

### Backend
- ✅ `backend/src/controllers/timetableController.ts` - New updateTimetableStatus method
- ✅ `backend/src/routes/timetable.ts` - New PATCH route

### Frontend
- ✅ `frontend/src/features/schedule/hooks/useTimetable.ts` - New hook
- ✅ `frontend/src/features/schedule/pages/Timetable.tsx` - UI updates

## Summary

✨ **Complete Status Update Feature Implemented!**

- ✅ Backend API with authorization
- ✅ Frontend dropdown with instant feedback
- ✅ Real-time updates for admins
- ✅ Color-coded status badges
- ✅ Activity logging
- ✅ Error handling
- ✅ Modern pink theme design
- ✅ Mobile responsive
- ✅ Accessible

**Teachers can now easily update their class status, and admins see all changes in real-time!** 🎉

