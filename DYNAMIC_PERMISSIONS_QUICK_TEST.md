# Dynamic Permissions - Quick Test Guide

## 🚀 Quick Start

Your dynamic permission system is ready! Here's how to test it:

---

## ✅ Step 1: Refresh Your Application

```bash
# The frontend should auto-reload (Vite hot reload)
# If not, manually refresh browser: Ctrl + Shift + R
```

---

## 🧪 Step 2: Test the System

### **Scenario A: Grant New Menu**

1. **Login as Super Admin**
   - Email: Your super admin email
   - Password: Your password

2. **Go to Settings → Role Menu Permissions**

3. **Select "VIEWER" role from dropdown**

4. **Current state:** Should show only 2 menus checked:
   - ✅ Lectures
   - ✅ Settings

5. **Check "COURSES" menu**

6. **Click "Save Permissions"**
   - Expected: ✅ "Menu permissions updated successfully"

7. **Logout**

8. **Login as Viewer** (create a test viewer user if needed)

9. **Expected Results:**
   - ✅ Sidebar shows: Lectures, Settings, **Courses**
   - ✅ Can click and access Courses page
   - ✅ No redirect or error

---

### **Scenario B: Remove Menu**

1. **Login as Super Admin**

2. **Go to Settings → Role Menu Permissions**

3. **Select "TEACHER" role**

4. **Uncheck "TIMETABLE"**

5. **Save**

6. **Logout and login as Teacher**

7. **Expected:**
   - ❌ Timetable NOT in sidebar
   - ✅ If you try `/timetable` URL → redirected

---

### **Scenario C: Real-time Update**

1. **Open 2 browser windows:**
   - Window A: Super Admin
   - Window B: Teacher

2. **Window B:** Note current menus

3. **Window A:** Add "Users" to Teacher role

4. **Window A:** Save

5. **Window B:** Navigate or refresh

6. **Expected:** Users menu appears!

---

## 🔍 Debugging

### **Check Permissions in Browser**

Open **DevTools (F12)** → **Application** → **Local Storage**:

```
permissions-storage: {
  "state": {
    "menuPermissions": [...],
    "allowedPaths": ["/lectures", "/settings", "/courses"]
  }
}
```

### **Check Console Logs**

Look for:
```
✅ Menu permissions loaded: ['/lectures', '/settings', '/courses']
🔄 Permissions updated, refreshing...
```

### **Check Network Requests**

DevTools → **Network** tab:
- `GET /api/menu-permissions/me` → Should return your menus
- `PUT /api/menu-permissions/role/:id` → Should succeed (200)

---

## 🎯 Expected Behavior

### **✅ Working:**
- Sidebar shows menus from database
- Can click and access all sidebar menus
- No redirect loops
- Changes reflected after save (may need refresh)
- Menu visibility = route access

### **❌ Not Working:**
- Menu appears but can't click → Check console errors
- Redirected immediately → Check `allowedPaths` in localStorage
- Changes not saving → Check API response in Network tab

---

## 🔧 Quick Fixes

### **Clear Cache:**
```
1. Open DevTools (F12)
2. Right-click Refresh button
3. Select "Empty Cache and Hard Reload"
```

### **Reset Permissions:**
```javascript
// In browser console:
localStorage.removeItem('permissions-storage')
location.reload()
```

### **Check Backend:**
```bash
# Verify backend is running
# Should see: "Server running on http://localhost:3001"
```

---

## 📊 Test Matrix

| Role | Default Menus | Add Menu | Remove Menu | Access Route |
|------|---------------|----------|-------------|--------------|
| Super Admin | All 7 | ✅ | ✅ | ✅ |
| Admin | All 7 | ✅ | ✅ | ✅ |
| Teacher | 4 menus | ✅ | ✅ | ✅ |
| Viewer | 2 menus | ✅ | ✅ | ✅ |
| Support | 3 menus | ✅ | ✅ | ✅ |

---

## 🎉 Success Indicators

You'll know it's working when:

1. ✅ Menus added via UI appear in sidebar
2. ✅ Can click and access new menus
3. ✅ Removed menus disappear from sidebar
4. ✅ Direct URL access blocked for removed menus
5. ✅ No console errors
6. ✅ Changes persist after page refresh

---

## 📞 Still Having Issues?

1. **Check `DYNAMIC_ROUTING_PERMISSIONS_COMPLETE.md`** for detailed explanation
2. **Verify backend is running** (port 3001)
3. **Check browser console** for error messages
4. **Check Network tab** for failed API calls
5. **Clear localStorage** and try again

---

## 💡 Pro Tips

- **Use hard refresh** (Ctrl + Shift + R) after changes
- **Check localStorage** to see cached permissions
- **Monitor console** for permission update events
- **Test with different roles** to verify access control

---

**Your dynamic permission system is ready!** 🚀

Test it now and watch menus become instantly accessible! ✨

