# Master Permission Control System - Quick Reference Card 📋

## 🚀 **Setup (One-Time)**

```bash
# 1. Run Database Migration
cd backend
npx prisma db push
npx prisma generate

# 2. Restart Backend
npm run build && npm run dev

# 3. Restart Frontend (in new terminal)
cd ../frontend
npm run dev
```

---

## 🎯 **How to Manage Menu Permissions**

### **Step 1: Login as Super Admin**
- Only Super Admins can manage menu permissions

### **Step 2: Go to Settings**
- Click "Settings" in the sidebar

### **Step 3: Scroll to "Role Menu Permissions"**
- This section is only visible to Super Admins

### **Step 4: Select a Role**
- Choose from dropdown: Admin, Teacher, Support, etc.

### **Step 5: Check/Uncheck Menus**
- Check = Role can see this menu
- Uncheck = Role cannot see this menu

### **Step 6: Save**
- Click "Save Permissions" button
- Changes take effect immediately

### **Step 7: Test**
- Logout and login as that role
- Verify sidebar shows correct menus

---

## 📊 **Available Menus**

| Menu Key | Menu Label | Path | Icon |
|----------|-----------|------|------|
| `dashboard` | Dashboard | `/` | LayoutDashboard |
| `courses` | Courses | `/courses` | BookOpen |
| `users` | Users | `/users` | Users |
| `enrollments` | Enrollments | `/enrollments` | CheckCircle |
| `lectures` | Lectures | `/lectures` | Video |
| `timetable` | Timetable | `/timetable` | Calendar |
| `settings` | Settings | `/settings` | Settings |
| `my-lectures` | My Lectures | `/my-lectures` | Video |

---

## 🔐 **Settings Page Access**

| Section | Super Admin | Admin | Others |
|---------|-------------|-------|--------|
| **Admin Contact Email** | ✅ Visible | ❌ Hidden | ❌ Hidden |
| **Change Password** | ✅ Visible | ✅ Visible | ✅ Visible |
| **Role Menu Permissions** | ✅ Visible | ❌ Hidden | ❌ Hidden |
| **User Roles List** | ✅ Visible | ✅ Visible | ❌ Hidden |

---

## 🔧 **API Endpoints**

### Get Current User's Menus
```bash
GET /api/menu-permissions/me
```

### Get Role's Menus
```bash
GET /api/menu-permissions/role/:roleId
```

### Update Role's Menus
```bash
PUT /api/menu-permissions/role/:roleId
Body: { "menuPermissions": [...] }
```

### Get Available Menus
```bash
GET /api/menu-permissions/available-menus
```

---

## 🐛 **Common Issues**

### **Issue**: "No menus available"
**Fix**: Run database migration to seed default permissions

### **Issue**: "Failed to fetch menu permissions"
**Fix**: Restart backend server

### **Issue**: Changes not visible
**Fix**: Logout and login again

### **Issue**: Cannot see Role Menu Permissions
**Fix**: Ensure you're logged in as Super Admin (not regular Admin)

---

## 💾 **Database Queries**

### View all permissions
```sql
SELECT * FROM role_menu_permissions ORDER BY role_id, sort_order;
```

### View permissions for specific role
```sql
SELECT * FROM role_menu_permissions WHERE role_id = 4;
```

### Manually add permission
```sql
INSERT INTO role_menu_permissions 
(role_id, menu_key, menu_label, menu_path, menu_icon, sort_order, enabled)
VALUES 
(4, 'dashboard', 'Dashboard', '/', 'LayoutDashboard', 0, true);
```

### Remove all permissions for a role
```sql
DELETE FROM role_menu_permissions WHERE role_id = 4;
```

---

## 📁 **Key Files**

### Backend
- `database/migrations/008_role_menu_permissions.sql`
- `backend/src/controllers/menuPermissionsController.ts`
- `backend/src/routes/menuPermissions.ts`

### Frontend
- `frontend/src/shared/components/layout/Layout.tsx`
- `frontend/src/features/settings/components/RoleMenuPermissions.tsx`
- `frontend/src/features/settings/pages/Settings.tsx`

### Documentation
- `MASTER_PERMISSION_CONTROL_SYSTEM.md` - Full guide
- `SETUP_MENU_PERMISSIONS.md` - Setup instructions
- `IMPLEMENTATION_SUMMARY.md` - Overview

---

## ✅ **Testing Checklist**

- [ ] Super Admin can access Role Menu Permissions
- [ ] Can select different roles
- [ ] Can check/uncheck menus
- [ ] Changes save successfully
- [ ] Changes persist after page refresh
- [ ] Non-super-admins don't see the section
- [ ] Sidebar updates dynamically
- [ ] All roles can access Change Password

---

## 🎯 **Quick Test Scenario**

1. **Login as Super Admin**
2. **Go to Settings > Role Menu Permissions**
3. **Select "Teacher" role**
4. **Uncheck "Timetable"**
5. **Click Save**
6. **Logout**
7. **Login as Teacher**
8. **Verify**: Timetable menu is gone from sidebar ✅

---

## 📞 **Need Help?**

1. Check browser console (F12)
2. Check server logs
3. Review `MASTER_PERMISSION_CONTROL_SYSTEM.md`
4. Verify database connectivity

---

## 🎉 **Success Indicators**

✅ Migration ran without errors  
✅ Backend started successfully  
✅ Frontend compiled without errors  
✅ Can login as Super Admin  
✅ Can see Role Menu Permissions section  
✅ Can modify and save permissions  
✅ Sidebar updates based on role  

---

**Print this card and keep it handy!** 📌

