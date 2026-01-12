# 🚀 Quick Start - Timetable Status Update Feature

## ⚡ Quick Overview

**What:** Teachers can now update their class status (Active/Cancelled/Completed) with a dropdown

**Who:**
- **Teachers** → Update status via dropdown (own classes only)
- **Admins** → View all updates in real-time (full edit access)

---

## 🎯 How to Use

### As a Teacher:

1. **Login** → Use your teacher credentials
2. **Go to** → Timetable Management (📅 in sidebar)
3. **Find** → Your class in the table
4. **Click** → Status dropdown (shows current status)
5. **Select** → New status:
   - 🟢 **Active** - Class is running normally
   - 🔴 **Cancelled** - Class is cancelled today
   - ⚪ **Completed** - Class has finished
6. **Done!** → Status updates immediately

**Visual Example:**
```
┌─────────────────────────────────────────┐
│ Course: Korean Basic                     │
│ Status: [▼ Active      ]  ← Click here  │
│         ├─ Active                       │
│         ├─ Cancelled    ← Select this   │
│         └─ Completed                    │
└─────────────────────────────────────────┘
```

### As an Admin:

1. **Login** → Use admin credentials
2. **Go to** → Timetable Management
3. **View** → All classes and their status
4. **See** → Teacher updates appear instantly
5. **Edit** → Can still edit full entry if needed

---

## 🎨 Visual Guide

### Teacher's View
```
┌──────────────────────────────────────────────────────┐
│ Course Name  │ Level  │ Status           │ Actions  │
├──────────────────────────────────────────────────────┤
│ Korean Basic │ Begin  │ [Active ▼]       │View only │
│              │        │  (green dropdown)│          │
└──────────────────────────────────────────────────────┘
```

### Admin's View
```
┌──────────────────────────────────────────────────────┐
│ Course Name  │ Level  │ Status      │ Actions        │
├──────────────────────────────────────────────────────┤
│ Korean Basic │ Begin  │ [Active]    │ [Edit] [Delete]│
│              │        │ (green badge)│                │
└──────────────────────────────────────────────────────┘
```

---

## 🎨 Status Colors

| Status | Color | When to Use |
|--------|-------|-------------|
| 🟢 Active | Green | Class is running as scheduled |
| 🔴 Cancelled | Red | Class is cancelled (weather, emergency) |
| ⚪ Completed | Gray | Class has finished for the day |

---

## 📱 Notifications

### Success
```
┌────────────────────────────────┐
│ ✓ Status updated successfully  │
└────────────────────────────────┘
```

### Error
```
┌────────────────────────────────┐
│ ✗ Failed to update status      │
└────────────────────────────────┘
```

---

## 🔑 Common Scenarios

### Scenario 1: Cancel a Class
**When:** Weather is bad, can't teach today
**Action:** Change status from "Active" → "Cancelled"
**Result:** Students see class is cancelled

### Scenario 2: Mark Class Complete
**When:** Class just ended
**Action:** Change status from "Active" → "Completed"
**Result:** Entry marked as done

### Scenario 3: Reactivate a Class
**When:** Rescheduled cancelled class
**Action:** Change status from "Cancelled" → "Active"
**Result:** Class is back on schedule

---

## ⚙️ Technical Details

### Servers
- **Frontend:** http://localhost:5174
- **Backend:** http://localhost:3001
- **Status:** ✅ Both running

### API Endpoint
```
PATCH /api/timetable/:id/status
Body: { "status": "cancelled" }
```

### Permissions
- Teachers: Can update own entries only
- Admins: Can update any entry
- Requires authentication

---

## ❓ Troubleshooting

### "Unauthorized" error
- ✅ Make sure you're logged in as teacher or admin
- ✅ Teachers can only update their own classes

### Dropdown not working
- ✅ Check if you're logged in as teacher (admins see badges, not dropdowns)
- ✅ Refresh the page

### Changes not appearing
- ✅ Wait 1-2 seconds (optimistic update may be processing)
- ✅ Refresh the page
- ✅ Check network connection

---

## 🎓 Tips

### For Teachers:
- ✨ Update status before class if cancelling
- ✨ Mark completed after class ends
- ✨ Changes are instant - no save button needed
- ✨ Admin can see your updates immediately

### For Admins:
- ✨ Monitor teacher status updates in real-time
- ✨ Can override status if needed (use Edit button)
- ✨ Check activity logs for audit trail
- ✨ Status history tracked in database

---

## 🚨 Important Notes

1. **Auto-Save:** Dropdown changes save automatically
2. **Instant Updates:** No need to refresh page
3. **Real-Time:** Admins see changes immediately
4. **Audit Trail:** All changes logged
5. **Permissions:** Teachers can only update own classes

---

## 📞 Support

### If something's not working:
1. Check if you're logged in
2. Verify your role (teacher or admin)
3. Refresh the page
4. Check browser console for errors
5. Contact system administrator

---

## ✅ Quick Checklist

Before using the feature, make sure:
- [ ] You're logged in
- [ ] You're on the Timetable page
- [ ] You can see your classes (teachers) or all classes (admins)
- [ ] Status dropdown is visible (teachers) or badges (admins)
- [ ] Backend and frontend servers are running

---

## 🎉 You're Ready!

The feature is now live and ready to use. Teachers can easily update class status, and admins can monitor everything in real-time!

**Happy teaching! 🎓**

