# Role-Based Settings Access Implementation

## Overview
This document describes the implementation of role-based access control for the Settings menu and Settings page functionality.

## Changes Made

### 1. Frontend - Sidebar Menu (Layout.tsx)

**Location:** `frontend/src/shared/components/layout/Layout.tsx`

**Changes:**
- Added "Settings" menu item to `userNavigation` array (for User and Viewer roles)
- All roles now have access to the Settings menu in the sidebar

**Role-Based Menu Access:**

| Role | Menus Available |
|------|----------------|
| **Admin/Super Admin** | Dashboard, Courses, Users, Enrollments, Lectures, Timetable, Settings |
| **Teacher** | Courses, Lectures, Timetable, Settings |
| **Student** | Dashboard, My Lectures, Settings |
| **User** | Lectures, Settings |
| **Viewer** | Lectures, Settings |

### 2. Frontend - Settings Page (Settings.tsx)

**Location:** `frontend/src/features/settings/pages/Settings.tsx`

**Access Control Logic:**
- **Admin/Super Admin:** Can see ALL sections:
  - Admin Settings (Admin Name, Admin Contact Email)
  - Change Password
  - User Permissions (Roles)

- **All Other Roles (Teacher, Student, User, Viewer):** Can ONLY see:
  - Change Password section

**Implementation Details:**
```typescript
const isAdmin = user?.roleName === 'admin' || user?.roleName === 'super_admin'
```

The page uses conditional rendering with `{isAdmin && (...)}` to hide administrative sections from non-admin users.

### 3. Frontend - Route Protection (ProtectedRoute.tsx)

**Location:** `frontend/src/features/auth/components/ProtectedRoute.tsx`

**Critical Fix:**
- Added `/settings` to the `allowedPaths` array for User and Viewer roles
- Previously, these roles were restricted to only `/lectures` routes, which prevented access to Settings
- Now both `/lectures` and `/settings` are accessible for User and Viewer roles

**Updated Code:**
```typescript
// Viewer and User role restrictions: only allow /lectures and /settings routes
if (user?.roleName === 'viewer' || user?.roleName === 'user') {
  const allowedPaths = ['/lectures', '/settings']
  const isAllowedPath = allowedPaths.some(path => 
    location.pathname === path || location.pathname.startsWith(path + '/')
  )
  
  if (!isAllowedPath) {
    return <Navigate to="/lectures" replace />
  }
}
```

### 4. Backend - Password Change Security

**Location:** `backend/src/controllers/usersController.ts`

**Security Features:**
- ✅ Users can ONLY change their own password
- ✅ Requires current password verification
- ✅ New password must be at least 6 characters
- ✅ Passwords are hashed using bcrypt (10 rounds)
- ✅ Activity logging for password changes
- ✅ Super admins can change any user's password (if needed)

**Endpoint:** `POST /api/users/:id/change-password`

**Authorization Check:**
```typescript
if (requestingUser.id !== parseInt(id) && requestingUser.roleName !== 'super_admin') {
  throw new AppError('You can only change your own password', 403);
}
```

## Password Change Form Features

### UI Components:
1. **Current Password Field**
   - Required field
   - Eye icon toggle for visibility
   - Lock icon indicator

2. **New Password Field**
   - Minimum 6 characters (enforced client & server side)
   - Eye icon toggle for visibility
   - Lock icon indicator
   - Helper text: "Must be at least 6 characters long"

3. **Confirm New Password Field**
   - Must match new password
   - Eye icon toggle for visibility
   - Lock icon indicator

### Validation:
- ✅ Current password required
- ✅ New password minimum 6 characters
- ✅ New password and confirm password must match
- ✅ Current password must be correct (verified against database)

## Testing Checklist

### Admin Role Testing:
- [ ] Login as Admin
- [ ] Verify all menu items visible (Dashboard, Courses, Users, Enrollments, Lectures, Timetable, Settings)
- [ ] Navigate to Settings
- [ ] Verify "Admin Settings" section is visible
- [ ] Verify "Change Password" section is visible
- [ ] Verify "User Permissions" section is visible
- [ ] Test changing admin name and email
- [ ] Test changing password

### Teacher Role Testing:
- [ ] Login as Teacher
- [ ] Verify menu items: Courses, Lectures, Timetable, Settings
- [ ] Navigate to Settings
- [ ] Verify "Admin Settings" section is HIDDEN
- [ ] Verify "Change Password" section is visible
- [ ] Verify "User Permissions" section is HIDDEN
- [ ] Test changing password

### Student Role Testing:
- [ ] Login as Student
- [ ] Verify menu items: Dashboard, My Lectures, Settings
- [ ] Navigate to Settings
- [ ] Verify "Admin Settings" section is HIDDEN
- [ ] Verify "Change Password" section is visible
- [ ] Verify "User Permissions" section is HIDDEN
- [ ] Test changing password

### User Role Testing:
- [ ] Login as User
- [ ] Verify menu items: Lectures, Settings
- [ ] Navigate to Settings
- [ ] Verify "Admin Settings" section is HIDDEN
- [ ] Verify "Change Password" section is visible
- [ ] Verify "User Permissions" section is HIDDEN
- [ ] Test changing password

### Viewer Role Testing:
- [ ] Login as Viewer
- [ ] Verify menu items: Lectures, Settings
- [ ] Navigate to Settings
- [ ] Verify "Admin Settings" section is HIDDEN
- [ ] Verify "Change Password" section is visible
- [ ] Verify "User Permissions" section is HIDDEN
- [ ] Test changing password

### Security Testing:
- [ ] Try changing another user's password (should fail with 403)
- [ ] Try changing password with wrong current password (should fail)
- [ ] Try changing password with less than 6 characters (should fail)
- [ ] Try changing password with mismatched confirm password (should fail)
- [ ] Verify password is hashed in database (not plain text)

## API Endpoints

### Change Password
```
POST /api/users/:id/change-password
```

**Request Body:**
```json
{
  "currentPassword": "string",
  "newPassword": "string"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Current password is incorrect"
}
```

## Security Considerations

1. **Authentication Required:** All Settings page access requires valid JWT token
2. **Authorization:** Users can only modify their own password
3. **Password Verification:** Current password must be verified before allowing change
4. **Password Hashing:** All passwords stored as bcrypt hashes
5. **Minimum Length:** 6 character minimum enforced
6. **Activity Logging:** All password changes are logged for audit trail
7. **Role-Based UI:** Administrative settings hidden from non-admin users

## Files Modified

1. `frontend/src/shared/components/layout/Layout.tsx` - Added Settings to User/Viewer navigation
2. `frontend/src/features/settings/pages/Settings.tsx` - Already had proper role-based rendering
3. `frontend/src/features/auth/components/ProtectedRoute.tsx` - Added `/settings` to allowed paths for User/Viewer roles

## Files Verified (No Changes Needed)

1. `backend/src/controllers/usersController.ts` - Password change security already implemented
2. `backend/src/routes/users.ts` - Change password route already configured

## Conclusion

The implementation provides secure, role-based access to Settings functionality:
- ✅ All users can access Settings menu
- ✅ All users can change their own password
- ✅ Only admins can see administrative settings
- ✅ Backend enforces security at API level
- ✅ UI provides clear, user-friendly password change interface
- ✅ All password fields include visibility toggles

