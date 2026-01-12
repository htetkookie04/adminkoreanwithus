# Checkbox Binding Troubleshooting Guide

## Issue: Checkboxes Not Auto-Checking When Role Is Selected

If the checkboxes are not automatically checking based on the role's permissions, follow this debugging guide.

---

## 🔍 Step-by-Step Debugging

### **Step 1: Verify API Response**

Open browser DevTools (F12) → Network tab:

1. Select a role from the dropdown
2. Look for request to: `GET /api/menu-permissions/role/:roleId`
3. Click on the request
4. Check the response

**Expected Response Format:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "roleId": 1,
      "menuKey": "dashboard",     ← Must match exactly
      "menuLabel": "Dashboard",
      "menuPath": "/",
      "menuIcon": "LayoutDashboard",
      "sortOrder": 1,
      "enabled": true
    }
  ]
}
```

**Common Issues:**
- ❌ Response is null or undefined
- ❌ `data` field is missing
- ❌ `menuKey` values don't match available menus
- ❌ 404 or 500 error

---

### **Step 2: Check Console Logs**

Look in the Console tab for:

```
Loaded X menu permissions for role Y
```

**If you see this:**
- ✅ API call succeeded
- ✅ Data was received

**If you don't see this:**
- ❌ API call failed
- ❌ Check for error messages

---

### **Step 3: Enable Debug Logging**

In `RoleMenuPermissions.tsx`, uncomment the debug line:

```typescript
const isMenuSelected = (menuKey: string): boolean => {
  const isSelected = selectedMenus.some(m => m.menuKey === menuKey)
  // UNCOMMENT THIS LINE:
  console.log(`Menu ${menuKey} is ${isSelected ? 'SELECTED' : 'NOT SELECTED'}`)
  return isSelected
}
```

**Refresh and check console:**

```
Menu dashboard is SELECTED
Menu courses is NOT SELECTED
Menu users is SELECTED
```

If all show "NOT SELECTED" but the API returned data:
- ❌ `menuKey` mismatch
- ❌ `selectedMenus` state not updating

---

### **Step 4: Verify menuKey Matching**

Add this temporary code in `fetchRoleMenuPermissions()`:

```typescript
const fetchRoleMenuPermissions = async (roleId: number) => {
  setLoadingPermissions(true)
  try {
    const response = await api.get(`/menu-permissions/role/${roleId}`)
    const permissions = response.data.data
    
    // DEBUG: Print all menuKeys
    console.log('Available menu keys:', availableMenus.map(m => m.menuKey))
    console.log('Permission menu keys:', permissions.map((p: any) => p.menuKey))
    
    setSelectedMenus(Array.isArray(permissions) ? permissions : [])
  } catch (error) {
    console.error('Failed to fetch role menu permissions:', error)
    setSelectedMenus([])
  } finally {
    setLoadingPermissions(false)
  }
}
```

**Check if keys match exactly:**
```
Available menu keys: ['dashboard', 'courses', 'users']
Permission menu keys: ['dashboard', 'users']
```

**Common mismatches:**
- `'dashboard'` vs `'Dashboard'` (case sensitive!)
- `'my-lectures'` vs `'my_lectures'` (dash vs underscore)
- Extra spaces: `'users '` vs `'users'`

---

## 🔧 Common Fixes

### **Fix 1: API Returns Empty Array**

**Problem:** Database has no permissions for that role

**Solution:**
```sql
-- Check if permissions exist
SELECT * FROM role_menu_permissions WHERE role_id = 1;

-- If empty, insert default permissions
INSERT INTO role_menu_permissions (role_id, menu_key, menu_label, menu_path, menu_icon, sort_order, enabled)
VALUES 
  (1, 'dashboard', 'Dashboard', '/', 'LayoutDashboard', 1, true),
  (1, 'courses', 'Courses', '/courses', 'BookOpen', 2, true);
```

---

### **Fix 2: API Returns 404 Error**

**Problem:** Route not registered or backend not running

**Solution:**
```bash
# Restart backend
cd backend
npm run dev
```

Verify route is registered in `backend/src/index.ts`:
```typescript
app.use('/api/menu-permissions', menuPermissionsRouter);
```

---

### **Fix 3: menuKey Mismatch**

**Problem:** Keys in database don't match keys in available menus

**Solution 1: Update Database**
```sql
-- Fix menuKey in database
UPDATE role_menu_permissions 
SET menu_key = 'dashboard' 
WHERE menu_key = 'Dashboard';
```

**Solution 2: Update Available Menus**

In `menuPermissionsController.ts`:
```typescript
const availableMenus = [
  { menuKey: 'dashboard', ... },  // ← Make sure this matches database
  { menuKey: 'courses', ... },
  ...
]
```

---

### **Fix 4: State Not Updating**

**Problem:** `selectedMenus` state isn't updating after API call

**Add this debug code:**
```typescript
useEffect(() => {
  console.log('selectedMenus state changed:', selectedMenus)
}, [selectedMenus])
```

If state doesn't change:
- ❌ API response format is wrong
- ❌ Try hardcoding test data:

```typescript
// TEMPORARY TEST
const fetchRoleMenuPermissions = async (roleId: number) => {
  setLoadingPermissions(true)
  
  // Hardcode test data
  const testData = [
    {
      menuKey: 'dashboard',
      menuLabel: 'Dashboard',
      menuPath: '/',
      menuIcon: 'LayoutDashboard',
      sortOrder: 1,
      enabled: true
    }
  ]
  
  setSelectedMenus(testData)
  setLoadingPermissions(false)
}
```

If checkboxes work with test data → API response format is the issue

---

### **Fix 5: Checkbox State Binding Issue**

**Problem:** Checkbox doesn't respond to `checked` prop

**Verify checkbox rendering:**
```typescript
<input
  type="checkbox"
  checked={isSelected}           // ← Must be present
  onChange={() => toggleMenu(menu.menuKey)}  // ← Must be present
  className="..."
/>
```

**Both `checked` and `onChange` are required for controlled components in React!**

---

## 🧪 Test Suite

### **Test 1: Hard-coded Data**

Replace API call with hard-coded data:

```typescript
const fetchRoleMenuPermissions = async (roleId: number) => {
  const testData = [
    { menuKey: 'dashboard', menuLabel: 'Dashboard', menuPath: '/', menuIcon: 'LayoutDashboard', sortOrder: 1, enabled: true },
    { menuKey: 'users', menuLabel: 'Users', menuPath: '/users', menuIcon: 'Users', sortOrder: 2, enabled: true }
  ]
  setSelectedMenus(testData)
}
```

**Expected:** Dashboard and Users checkboxes should be checked

**If it works:** API response format is the problem  
**If it doesn't work:** Frontend logic is the problem

---

### **Test 2: Manual State Update**

In browser console:
```javascript
// Get React component state (requires React DevTools)
// Or manually trigger in code:
setSelectedMenus([
  { menuKey: 'dashboard', menuLabel: 'Dashboard', menuPath: '/', menuIcon: 'LayoutDashboard', sortOrder: 1, enabled: true }
])
```

**Expected:** Dashboard checkbox should check

---

### **Test 3: Direct API Call**

In browser console or Postman:
```bash
curl http://localhost:3001/api/menu-permissions/role/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Verify:**
- Status 200
- Valid JSON response
- `data` array contains objects with `menuKey` field

---

## 📋 Checklist

Run through this checklist:

- [ ] Backend server is running
- [ ] API endpoint `/api/menu-permissions/role/:roleId` exists
- [ ] API returns data in correct format
- [ ] Database has permissions for the selected role
- [ ] `menuKey` values match between database and available menus
- [ ] Console shows "Loaded X menu permissions for role Y"
- [ ] `selectedMenus` state updates after API call
- [ ] `isMenuSelected()` returns true for correct menus
- [ ] Checkbox has both `checked` and `onChange` props
- [ ] No console errors

---

## 🔍 Advanced Debugging

### **React DevTools Inspection**

1. Install React DevTools extension
2. Open DevTools → Components tab
3. Find `RoleMenuPermissions` component
4. Check state values:
   - `selectedMenus`: Should contain array of permissions
   - `availableMenus`: Should contain all possible menus
   - `loadingPermissions`: Should be false after loading

---

### **Network Request Inspection**

1. Open Network tab
2. Filter by "XHR" or "Fetch"
3. Select the menu-permissions request
4. Check:
   - Request URL: Correct role ID?
   - Request Headers: Valid auth token?
   - Response: Valid JSON?
   - Status Code: 200?

---

## 💡 Quick Solutions

### **Solution A: Reset Everything**

```bash
# Backend
cd backend
rm -rf node_modules
npm install
npx prisma generate
npm run build
npm run dev

# Frontend
cd frontend
rm -rf node_modules
npm install
npm run dev
```

---

### **Solution B: Check Database**

```sql
-- View all permissions
SELECT 
  r.name as role_name,
  rmp.menu_key,
  rmp.menu_label,
  rmp.enabled
FROM role_menu_permissions rmp
JOIN roles r ON r.id = rmp.role_id
ORDER BY r.id, rmp.sort_order;
```

---

### **Solution C: Re-run Migration**

```bash
cd backend

# If using SQL file
psql -d korean_with_us -f ../database/migrations/008_role_menu_permissions.sql

# If using Prisma
npx prisma db push
npx prisma generate
```

---

## 📞 Still Not Working?

If you've tried everything above and it still doesn't work:

1. **Check the browser console** for errors
2. **Check the server logs** for API errors
3. **Verify the database** has the correct data
4. **Test with curl** to isolate frontend vs backend issues
5. **Compare with working code** from the repository

---

## 📝 Expected Behavior Summary

1. User selects role → API fetches permissions
2. Permissions array → Updates `selectedMenus` state
3. `isMenuSelected()` → Checks if menu in array
4. `checked={isSelected}` → Binds to checkbox
5. Checkbox shows checked ✅ or unchecked ☐

**If any step fails, the checkboxes won't update correctly.**

Use this guide to identify which step is failing! 🔍

