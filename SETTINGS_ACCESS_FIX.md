# Settings Access Fix for User and Viewer Roles

## Problem
Users with "User" or "Viewer" roles could see the Settings menu in the sidebar but couldn't click it. When attempting to navigate to `/settings`, they were immediately redirected back to `/lectures`.

## Root Cause
The `ProtectedRoute` component had route restrictions that only allowed User and Viewer roles to access `/lectures` paths. The Settings page (`/settings`) was not included in the allowed paths, causing automatic redirection.

**Problematic Code (Before Fix):**
```typescript
// Viewer and User role restrictions: only allow /lectures routes
if (user?.roleName === 'viewer' || user?.roleName === 'user') {
  const allowedPaths = ['/lectures']  // ❌ Missing /settings
  const isAllowedPath = allowedPaths.some(path => 
    location.pathname === path || location.pathname.startsWith(path + '/')
  )
  
  if (!isAllowedPath) {
    return <Navigate to="/lectures" replace />
  }
}
```

## Solution
Added `/settings` to the `allowedPaths` array in the `ProtectedRoute` component.

**Fixed Code:**
```typescript
// Viewer and User role restrictions: only allow /lectures and /settings routes
if (user?.roleName === 'viewer' || user?.roleName === 'user') {
  const allowedPaths = ['/lectures', '/settings']  // ✅ Added /settings
  const isAllowedPath = allowedPaths.some(path => 
    location.pathname === path || location.pathname.startsWith(path + '/')
  )
  
  if (!isAllowedPath) {
    return <Navigate to="/lectures" replace />
  }
}
```

## File Modified
- **Location:** `frontend/src/features/auth/components/ProtectedRoute.tsx`
- **Lines Changed:** Line 19 (added `/settings` to allowedPaths array)

## Testing
After this fix, User and Viewer roles can now:
1. ✅ See the Settings menu in the sidebar
2. ✅ Click on the Settings menu
3. ✅ Access the Settings page at `/settings`
4. ✅ View and use the Change Password form
5. ✅ Cannot see Admin Settings or User Permissions sections (properly hidden)

## Verification Steps
1. Login as a User role account
2. Click on "Settings" in the sidebar
3. Confirm you can access the Settings page
4. Verify only "Change Password" section is visible
5. Test changing your password

## Related Files
- `frontend/src/shared/components/layout/Layout.tsx` - Sidebar navigation with Settings menu
- `frontend/src/features/settings/pages/Settings.tsx` - Settings page with role-based content
- `frontend/src/App.tsx` - Route configuration

## Impact
- **User Role:** Can now access Settings to change password ✅
- **Viewer Role:** Can now access Settings to change password ✅
- **Other Roles:** No impact, already had proper access ✅
- **Security:** No security concerns, Settings page already has proper role-based rendering ✅

## Date Fixed
January 12, 2026

