# Master Permission Control System - Implementation Guide

## Overview

This document describes the implementation of a comprehensive Master Permission Control System that allows dynamic management of sidebar menus based on user roles without requiring code changes.

## Features Implemented

### 1. **Database Schema**
- **New Table**: `role_menu_permissions`
  - Maps roles to menu items
  - Supports menu ordering, enabling/disabling
  - Includes menu metadata (label, path, icon)

### 2. **Backend API Endpoints**
- `GET /api/menu-permissions/me` - Get current user's menu permissions
- `GET /api/menu-permissions/role/:roleId` - Get menu permissions for a specific role
- `GET /api/menu-permissions/available-menus` - Get list of all available menus
- `PUT /api/menu-permissions/role/:roleId` - Update menu permissions for a role
- `PATCH /api/menu-permissions/:id/toggle` - Toggle a menu permission
- `GET /api/menu-permissions` - Get all menu permissions (admin)

### 3. **Frontend Components**

#### **Role Menu Permissions Component** (`RoleMenuPermissions.tsx`)
- Visual interface for managing role-based menu access
- Checkbox selection for each menu item
- Real-time preview of selected menus
- Role selector dropdown
- Save/Update functionality

#### **Dynamic Sidebar** (`Layout.tsx`)
- Fetches menu permissions from API based on user role
- Dynamically renders only allowed menus
- Falls back to hardcoded menus if API fails
- Loading state while fetching permissions

#### **Settings Page Updates**
- **Super Admin Only**: Can see and edit Admin Contact Email section
- **Super Admin Only**: Can manage Role Menu Permissions
- **All Roles**: Can access Change Password section
- **All Admins**: Can view User Roles list

## Database Migration

### Step 1: Run the Migration

#### Using PostgreSQL directly:
```bash
psql -d korean_with_us -f database/migrations/008_role_menu_permissions.sql
```

#### Using Prisma:
```bash
cd backend
npx prisma db push
npx prisma generate
```

### Step 2: Verify Migration

Check if the table was created:
```sql
SELECT * FROM role_menu_permissions;
```

## Default Menu Permissions

The migration automatically seeds default permissions for all roles:

### **Super Admin & Admin** (role_id: 1, 2)
- ✅ Dashboard
- ✅ Courses
- ✅ Users
- ✅ Enrollments
- ✅ Lectures
- ✅ Timetable
- ✅ Settings

### **Course Manager & Teacher** (role_id: 3, 4)
- ✅ Courses
- ✅ Lectures
- ✅ Timetable
- ✅ Settings

### **Support** (role_id: 5)
- ✅ Users
- ✅ Enrollments
- ✅ Settings

### **Sales** (role_id: 6)
- ✅ Courses
- ✅ Enrollments
- ✅ Settings

### **Viewer** (role_id: 7)
- ✅ Lectures
- ✅ Settings

### **Student** (role_id: 8)
- ✅ Dashboard
- ✅ My Lectures
- ✅ Settings

## How to Use

### For Super Admins:

1. **Login as Super Admin**
2. **Navigate to Settings Page**
3. **Scroll to "Role Menu Permissions" Section**
4. **Select a Role from the dropdown**
5. **Check/Uncheck menus** that role should have access to
6. **Click "Save Permissions"**
7. **Changes take effect immediately** for all users with that role

### For Regular Users:

- After login, the sidebar will automatically display only the menus they have permission to access
- No manual configuration needed

## Settings Page Access Control

### Super Admin
- ✅ Admin Settings (Name, Contact Email)
- ✅ Change Password
- ✅ Role Menu Permissions
- ✅ User Roles List

### Admin
- ❌ Admin Settings (Hidden)
- ✅ Change Password
- ❌ Role Menu Permissions (Hidden)
- ✅ User Roles List

### All Other Roles (Teacher, Student, User, Viewer)
- ❌ Admin Settings (Hidden)
- ✅ Change Password
- ❌ Role Menu Permissions (Hidden)
- ❌ User Roles List (Hidden)

## Technical Details

### Backend Files Modified/Created:
- ✅ `database/migrations/008_role_menu_permissions.sql` - Database migration
- ✅ `backend/prisma/schema.prisma` - Added RoleMenuPermission model
- ✅ `backend/src/controllers/menuPermissionsController.ts` - New controller
- ✅ `backend/src/routes/menuPermissions.ts` - New route
- ✅ `backend/src/index.ts` - Registered new route

### Frontend Files Modified/Created:
- ✅ `frontend/src/shared/components/layout/Layout.tsx` - Dynamic sidebar
- ✅ `frontend/src/features/settings/pages/Settings.tsx` - Added role permissions UI
- ✅ `frontend/src/features/settings/components/RoleMenuPermissions.tsx` - New component

## API Response Examples

### Get Current User's Menus
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "menuKey": "dashboard",
      "menuLabel": "Dashboard",
      "menuPath": "/",
      "menuIcon": "LayoutDashboard",
      "sortOrder": 1
    },
    {
      "id": 2,
      "menuKey": "courses",
      "menuLabel": "Courses",
      "menuPath": "/courses",
      "menuIcon": "BookOpen",
      "sortOrder": 2
    }
  ]
}
```

### Update Role Menu Permissions
```json
// Request Body
{
  "menuPermissions": [
    {
      "menuKey": "dashboard",
      "menuLabel": "Dashboard",
      "menuPath": "/",
      "menuIcon": "LayoutDashboard",
      "sortOrder": 0,
      "enabled": true
    },
    {
      "menuKey": "lectures",
      "menuLabel": "Lectures",
      "menuPath": "/lectures",
      "menuIcon": "Video",
      "sortOrder": 1,
      "enabled": true
    }
  ]
}
```

## Testing the Implementation

### Test 1: View Current Permissions
1. Login as any user
2. Sidebar should display only allowed menus
3. Check browser console for any errors

### Test 2: Modify Permissions (Super Admin)
1. Login as Super Admin
2. Go to Settings > Role Menu Permissions
3. Select a role (e.g., "Teacher")
4. Uncheck "Timetable" menu
5. Save changes
6. Logout and login as a Teacher
7. Verify "Timetable" menu is no longer visible

### Test 3: Settings Page Access
1. **As Super Admin**: Verify all sections are visible
2. **As Admin**: Verify "Admin Settings" and "Role Menu Permissions" are hidden
3. **As Teacher**: Verify only "Change Password" is visible

## Troubleshooting

### Issue: Menus not showing up
**Solution**: 
- Check if menu permissions exist for that role in database
- Verify API endpoint is working: `/api/menu-permissions/me`
- Check browser console for errors

### Issue: Changes not taking effect
**Solution**:
- Logout and login again to refresh the session
- Check if the role_id matches correctly
- Verify database was updated with `SELECT * FROM role_menu_permissions WHERE role_id = X`

### Issue: "No menus available" message
**Solution**:
- Run the migration to seed default permissions
- Or manually add permissions through API or database

## Future Enhancements

Possible additions:
- Drag-and-drop menu reordering
- Permission presets/templates
- Audit log for permission changes
- Bulk role permission copy
- Permission inheritance
- Sub-menu/nested menu support

## Security Considerations

1. **Authorization**: Only Super Admins should be able to modify menu permissions
2. **Validation**: Backend validates all permission updates
3. **Database Constraints**: Unique constraint prevents duplicate menu assignments
4. **Fallback**: System falls back to hardcoded permissions if database fails
5. **Frontend Protection**: UI hides management interface from non-super-admins

## Maintenance

### Adding New Menus to the System

1. **Update Available Menus** in `menuPermissionsController.ts`:
```typescript
const availableMenus = [
  // ... existing menus
  { menuKey: 'new-menu', menuLabel: 'New Menu', menuPath: '/new-menu', menuIcon: 'IconName' }
]
```

2. **Add Icon Mapping** in `Layout.tsx`:
```typescript
import { IconName } from 'lucide-react'

const iconMap: Record<string, LucideIcon> = {
  // ... existing icons
  IconName
}
```

3. **Assign to Roles** via Settings UI or directly in database

## Conclusion

The Master Permission Control System provides:
- ✅ Dynamic menu management without code changes
- ✅ Role-based access control
- ✅ Intuitive admin interface
- ✅ Scalable architecture
- ✅ Fallback mechanisms for reliability
- ✅ Granular Settings page access control

For questions or issues, contact the development team.

