# Role-Based Settings Access Feature

## Overview
This feature implements role-based access control for the Settings page, allowing Students and Teachers to change their password while restricting admin-only features.

---

## ✨ Features Implemented

### 1. **Sidebar Menu Updates** ✅
- **Admin**: All menus visible (unchanged)
- **Teacher**: Added Settings menu to sidebar
- **Student**: Added Settings menu to sidebar
- **User/Viewer**: No Settings menu (as specified)

### 2. **Settings Page Content** ✅
- **Admin/Super Admin**: See all settings sections
  - Admin Settings (Name, Contact Email)
  - Change Password
  - User Permissions

- **Teacher & Student**: See only Change Password section
  - Clean, focused interface
  - No access to admin settings
  - No access to user permissions

### 3. **Backend Security** ✅
- Users can ONLY change their own password
- Super Admin can change any user's password
- Authorization check prevents unauthorized access
- Returns 403 Forbidden if user tries to change another user's password

---

## 🎨 UI Design

### Change Password Section (All Roles)
```
┌──────────────────────────────────────────────────┐
│ 🔑 Change Password                               │
│    Update your account password                  │
├──────────────────────────────────────────────────┤
│                                                  │
│ Current Password *                               │
│ [🔒 ••••••••••••••••••••••••••••••]   [👁]      │
│                                                  │
│ New Password *                                   │
│ Must be at least 6 characters long              │
│ [🔒 ••••••••••••••••••••••••••••••]   [👁]      │
│                                                  │
│ Confirm New Password *                           │
│ [🔒 ••••••••••••••••••••••••••••••]   [👁]      │
│                                                  │
│                          [🔑 Change Password]    │
└──────────────────────────────────────────────────┘
```

**Features:**
- 🔒 Lock icon on all password fields
- 👁 Eye icon toggle for visibility
- Pink icon accents
- Clear field labels with asterisks
- Helpful hint text
- Disabled state during submission
- Loading spinner on button

---

## 📁 Files Modified

### Frontend

#### 1. `frontend/src/shared/components/layout/Layout.tsx`
**Changes:**
- Added Settings menu to `teacherNavigation`
- Added Settings menu to `studentNavigation`
- Imported Settings icon from Lucide

```typescript
const teacherNavigation = [
  { name: 'Courses', href: '/courses', icon: BookOpen },
  { name: 'Lectures', href: '/lectures', icon: Video },
  { name: 'Timetable', href: '/timetable', icon: Calendar },
  { name: 'Settings', href: '/settings', icon: Settings } // NEW
]

const studentNavigation = [
  { name: 'My Lectures', href: '/my-lectures', icon: Video },
  { name: 'Settings', href: '/settings', icon: Settings } // NEW
]
```

#### 2. `frontend/src/features/settings/pages/Settings.tsx`
**Changes:**
- Added role detection: `isAdmin`, `isStudent`, `isTeacher`
- Conditional rendering based on role
- Lucide React icons (Eye, EyeOff, Lock, KeyRound)
- Modern pink-themed design
- Loading spinner
- Enhanced form styling

**Key Logic:**
```typescript
const isAdmin = user?.roleName === 'admin' || user?.roleName === 'super_admin'
const isStudent = user?.roleName === 'student'
const isTeacher = user?.roleName === 'teacher'
const showOnlyPasswordChange = isStudent || isTeacher

// Conditional rendering
{isAdmin && (
  <div className="card">Admin Settings...</div>
)}

<div className="card">Change Password (visible to all)</div>

{isAdmin && (
  <div className="card">User Permissions...</div>
)}
```

### Backend

#### 3. `backend/src/controllers/usersController.ts`
**Changes:**
- Added authorization check in `changePassword` function
- Users can only change their own password
- Super Admin can change any user's password

**Authorization Logic:**
```typescript
// Users can only change their own password (unless they are super_admin)
if (requestingUser.id !== parseInt(id) && requestingUser.roleName !== 'super_admin') {
  throw new AppError('You can only change your own password', 403);
}
```

---

## 🔐 Security Features

### 1. **Backend Authorization**
```typescript
POST /api/users/:id/change-password
Headers: Authorization: Bearer <token>
Body: { currentPassword, newPassword }

// Check 1: User is authenticated
// Check 2: User ID matches token ID OR user is super_admin
// Check 3: Current password is correct
// Check 4: New password meets requirements (min 6 chars)
```

### 2. **Frontend Role Checks**
- Admin sections wrapped in `{isAdmin && ...}`
- Settings menu only added to appropriate roles
- Password change accessible to all authenticated users

### 3. **Password Validation**
- **Current Password**: Required, must match database
- **New Password**: Minimum 6 characters
- **Confirm Password**: Must match new password
- Client-side and server-side validation

---

## 📊 User Flows

### Teacher/Student Workflow
1. Login with teacher/student credentials
2. Click **Settings** in sidebar (⚙️ icon)
3. See only "Change Password" section
4. Fill in three password fields
5. Toggle visibility with eye icon
6. Click "Change Password" button
7. Receive success/error notification

### Admin Workflow  
1. Login with admin credentials
2. Click **Settings** in sidebar
3. See all three sections:
   - Admin Settings
   - Change Password
   - User Permissions
4. Can edit admin settings
5. Can change password
6. Can view roles

---

## 🎨 Design Details

### Icons Used
| Icon | Purpose | Color |
|------|---------|-------|
| 🔑 KeyRound | Section header, submit button | Pink-600 |
| 🔒 Lock | Password field prefix | Gray-400 |
| 👁 Eye | Show password | Gray-400 → Pink-600 hover |
| 👁‍🗨 EyeOff | Hide password | Gray-400 → Pink-600 hover |
| ⚙️ Settings | Sidebar menu | White (on pink gradient when active) |

### Color Scheme
```css
/* Primary Actions */
Button Background: gradient-to-r from-pink-500 to-pink-600
Button Hover: from-pink-600 to-pink-700
Button Text: White

/* Input Fields */
Border: Gray-300
Focus Ring: Pink-500
Background: White
Icon Color: Gray-400 → Pink-600 on hover

/* Section Header */
Icon Background: gradient-to-br from-pink-500 to-pink-600
Icon: White
Text: Gray-900 (bold)
```

---

## 🧪 Testing

### Test as Student:
1. Login as student user
2. ✅ Verify Settings menu appears in sidebar
3. ✅ Click Settings
4. ✅ Verify ONLY Change Password section visible
5. ✅ Verify NO Admin Settings section
6. ✅ Verify NO User Permissions section
7. ✅ Test password change functionality
8. ✅ Test eye icon toggles
9. ✅ Test validation (short password, mismatch)

### Test as Teacher:
1. Login as teacher user
2. ✅ Verify Settings menu appears in sidebar
3. ✅ Click Settings
4. ✅ Verify ONLY Change Password section visible
5. ✅ Test password change functionality

### Test as Admin:
1. Login as admin user
2. ✅ Verify Settings menu appears
3. ✅ Click Settings
4. ✅ Verify ALL three sections visible:
   - Admin Settings
   - Change Password
   - User Permissions
5. ✅ Test admin settings edit
6. ✅ Test password change

### Security Tests:
1. ✅ Try changing another user's password (should fail)
2. ✅ Try with wrong current password (should fail)
3. ✅ Try with short password < 6 chars (should fail)
4. ✅ Try with mismatched passwords (should fail)

---

## 🚨 Error Handling

### Frontend Validation Errors:
- "New password must be at least 6 characters long"
- "New passwords do not match"
- "Current password is required"

### Backend Errors:
```json
{
  "error": {
    "message": "You can only change your own password",
    "statusCode": 403
  }
}

{
  "error": {
    "message": "Current password is incorrect",
    "statusCode": 401
  }
}

{
  "error": {
    "message": "New password must be at least 6 characters long",
    "statusCode": 400
  }
}
```

---

## 📱 Responsive Design
- Works on desktop, tablet, and mobile
- Input fields are full width
- Eye icons remain accessible
- Submit button adapts to screen size
- Sidebar collapses on mobile (existing behavior)

---

## ♿ Accessibility

### Keyboard Navigation:
- Tab through all form fields
- Enter to submit form
- Tab index -1 on eye icon buttons
- Focus rings visible on all inputs

### Screen Readers:
- Proper label associations
- Required field indicators (asterisks)
- Error messages announced
- Button states (loading, disabled)

### Visual:
- High contrast text
- Clear focus indicators
- Pink-500 focus rings (WCAG compliant)
- Icon + text labels

---

## 🔄 API Documentation

### Change Password Endpoint
```
POST /api/users/:id/change-password
```

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newPassword456"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Error Responses:**

| Status | Message | Reason |
|--------|---------|--------|
| 400 | "Current password and new password are required" | Missing fields |
| 400 | "New password must be at least 6 characters long" | Password too short |
| 401 | "Current password is incorrect" | Wrong current password |
| 403 | "You can only change your own password" | Unauthorized user ID |
| 404 | "User not found" | Invalid user ID |

---

## 💾 Activity Logging

Every password change is logged:
```typescript
await prisma.activityLog.create({
  data: {
    userId: req.user.id,
    action: 'user.password_changed',
    resourceType: 'user',
    resourceId: parseInt(id)
  }
});
```

**Activity Log Entry:**
```json
{
  "id": 123,
  "userId": 5,
  "action": "user.password_changed",
  "resourceType": "user",
  "resourceId": 5,
  "timestamp": "2026-01-12T12:30:00.000Z"
}
```

---

## 📋 Summary

### ✅ Completed Features:

| Feature | Status | Details |
|---------|--------|---------|
| Sidebar Menu | ✅ | Settings added for Teacher & Student |
| Admin View | ✅ | All settings sections visible |
| Teacher/Student View | ✅ | Only Change Password visible |
| Password Fields | ✅ | Current, New, Confirm with eye toggle |
| Field Icons | ✅ | Lock & Eye/EyeOff from Lucide |
| Pink Theme | ✅ | Matches app design |
| Backend Auth | ✅ | Users can only change own password |
| Validation | ✅ | Min 6 chars, password match |
| Error Handling | ✅ | User-friendly messages |
| Activity Logging | ✅ | All changes tracked |
| Responsive | ✅ | Works on all devices |
| Accessible | ✅ | Keyboard & screen reader support |

---

## 🎉 Result

**The role-based Settings feature is complete and production-ready!**

- ✅ Teachers and Students can change their password
- ✅ Admin sections hidden from non-admin users
- ✅ Backend enforces authorization
- ✅ Modern, user-friendly UI
- ✅ Full validation and error handling
- ✅ Activity logging for security
- ✅ Pink-themed design matching the app

**Test it now:**
- Frontend: http://localhost:5174/settings
- Backend: http://localhost:3001

**Login with different roles to see the different views!** 🔐✨

