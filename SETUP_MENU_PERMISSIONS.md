# Quick Setup Guide - Master Permission Control System

## Prerequisites
- PostgreSQL database is running
- Backend server is set up
- Frontend is configured

## Step-by-Step Setup

### 1. Database Migration

Run the migration to create the `role_menu_permissions` table:

```bash
# Option A: Using psql (if you have direct database access)
psql -d korean_with_us -f database/migrations/008_role_menu_permissions.sql

# Option B: Using Prisma (recommended)
cd backend
npx prisma db push
npx prisma generate
```

### 2. Update Backend Dependencies (if needed)

```bash
cd backend
npm install
```

### 3. Rebuild Backend

```bash
cd backend
npm run build
```

### 4. Restart Backend Server

```bash
cd backend
npm run dev
```

### 5. Update Frontend Dependencies (if needed)

```bash
cd frontend
npm install
```

### 6. Restart Frontend

```bash
cd frontend
npm run dev
```

## Verification Steps

### 1. Check Database

Verify the table was created:
```sql
-- Connect to your database
psql -d korean_with_us

-- Check if table exists
\dt role_menu_permissions

-- View seeded data
SELECT * FROM role_menu_permissions ORDER BY role_id, sort_order;

-- Exit
\q
```

### 2. Test Backend API

```bash
# Test available menus endpoint (should return list of menus)
curl http://localhost:3001/api/menu-permissions/available-menus \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test user menu permissions
curl http://localhost:3001/api/menu-permissions/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Test Frontend

1. **Login as Super Admin**
   - Email: `admin@koreanwithus.com` (or your super admin email)
   - Password: Your admin password

2. **Navigate to Settings**
   - You should see "Role Menu Permissions" section
   - All admin sections should be visible

3. **Test Menu Management**
   - Click on Role Menu Permissions
   - Select a role from dropdown
   - You should see checkboxes for all available menus
   - Try checking/unchecking menus
   - Click "Save Permissions"
   - You should see a success message

4. **Test as Different Role**
   - Logout
   - Login as a different role (e.g., Teacher)
   - Sidebar should show only allowed menus
   - Settings page should only show "Change Password"

## Common Issues & Solutions

### Issue 1: "Failed to fetch menu permissions" error
**Cause**: Backend route not registered or server not restarted
**Solution**: 
```bash
cd backend
npm run build
npm run dev
```

### Issue 2: Table already exists error
**Cause**: Migration already ran
**Solution**: Skip migration or drop table first:
```sql
DROP TABLE IF EXISTS role_menu_permissions CASCADE;
```
Then run migration again.

### Issue 3: No menus showing in sidebar
**Cause**: No permissions seeded for role
**Solution**: Login as Super Admin and assign menus via Settings UI, or:
```sql
-- Manually insert permissions for a role
INSERT INTO role_menu_permissions (role_id, menu_key, menu_label, menu_path, menu_icon, sort_order, enabled)
VALUES 
  (4, 'lectures', 'Lectures', '/lectures', 'Video', 1, true),
  (4, 'settings', 'Settings', '/settings', 'Settings', 2, true);
```

### Issue 4: Prisma client errors
**Cause**: Prisma client not regenerated after schema changes
**Solution**:
```bash
cd backend
npx prisma generate
```

### Issue 5: Import errors in TypeScript
**Cause**: New files not recognized by TypeScript
**Solution**: Restart your IDE or TypeScript server

## Testing Checklist

- [ ] Database migration completed successfully
- [ ] Backend server starts without errors
- [ ] Frontend compiles without errors
- [ ] Super Admin can access Settings > Role Menu Permissions
- [ ] Can select different roles and see their current menus
- [ ] Can check/uncheck menus and save changes
- [ ] Changes persist after page refresh
- [ ] Non-super-admin users don't see Role Menu Permissions section
- [ ] Non-super-admin users don't see Admin Settings section
- [ ] All users can access Change Password section
- [ ] Sidebar dynamically updates based on role permissions
- [ ] Fallback navigation works if API fails

## Default Login Credentials

If you need to test different roles, use these (adjust based on your seed data):

```
Super Admin:
- Email: admin@koreanwithus.com
- Password: admin123

Admin:
- Email: admin@example.com
- Password: [your admin password]

Teacher:
- Email: teacher@example.com
- Password: [your teacher password]
```

## File Checklist

Ensure these files exist:

**Backend:**
- [x] `database/migrations/008_role_menu_permissions.sql`
- [x] `backend/prisma/schema.prisma` (updated)
- [x] `backend/src/controllers/menuPermissionsController.ts`
- [x] `backend/src/routes/menuPermissions.ts`
- [x] `backend/src/index.ts` (updated)

**Frontend:**
- [x] `frontend/src/shared/components/layout/Layout.tsx` (updated)
- [x] `frontend/src/features/settings/pages/Settings.tsx` (updated)
- [x] `frontend/src/features/settings/components/RoleMenuPermissions.tsx`

**Documentation:**
- [x] `MASTER_PERMISSION_CONTROL_SYSTEM.md`
- [x] `SETUP_MENU_PERMISSIONS.md`

## Next Steps

1. **Run the setup commands above**
2. **Test the system** using the verification steps
3. **Customize default permissions** if needed
4. **Train your team** on how to use the Role Menu Permissions feature
5. **Monitor logs** for any errors or issues

## Support

If you encounter issues:
1. Check the console logs (browser & server)
2. Verify database connectivity
3. Review the troubleshooting section in `MASTER_PERMISSION_CONTROL_SYSTEM.md`
4. Check API responses using browser DevTools Network tab

## Rollback (if needed)

If you need to rollback the changes:

```sql
-- Drop the table
DROP TABLE IF EXISTS role_menu_permissions CASCADE;

-- Remove from Prisma schema
-- Comment out or delete the RoleMenuPermission model

-- Regenerate Prisma client
npx prisma generate

-- Restart services
```

Then restore the old Layout.tsx and Settings.tsx files from version control.

