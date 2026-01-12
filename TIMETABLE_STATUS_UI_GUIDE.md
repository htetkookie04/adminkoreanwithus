# Timetable Status Update - UI Guide

## Visual Design Changes

### Before & After

#### **Admin View**
```
┌─────────────────────────────────────────────────────────────┐
│ Course      │ Level  │ Status   │ Actions                   │
├─────────────────────────────────────────────────────────────┤
│ Basic Class │ Beg... │ [Active] │ [Edit] [Delete]          │
│ Level 3     │ Int... │ [Canc..] │ [Edit] [Delete]          │
└─────────────────────────────────────────────────────────────┘
```

#### **Teacher View (NEW)**
```
┌─────────────────────────────────────────────────────────────┐
│ Course      │ Level  │ Status               │ Actions       │
├─────────────────────────────────────────────────────────────┤
│ Basic Class │ Beg... │ [▼ Active      ]     │ View only    │
│                      │   Cancelled          │              │
│                      │   Completed          │              │
└─────────────────────────────────────────────────────────────┘
```

## Status Dropdown Design

### Active Status (Selected)
```css
Background: #f0fdf4 (green-50)
Text: #15803d (green-700)
Border: #bbf7d0 (green-200)
Hover: #dcfce7 (green-100)
```

### Cancelled Status (Selected)
```css
Background: #fef2f2 (red-50)
Text: #b91c1c (red-700)
Border: #fecaca (red-200)
Hover: #fee2e2 (red-100)
```

### Completed Status (Selected)
```css
Background: #f9fafb (gray-50)
Text: #374151 (gray-700)
Border: #e5e7eb (gray-200)
Hover: #f3f4f6 (gray-100)
```

## Interactive Elements

### Teacher's Status Dropdown
```html
<select class="status-dropdown">
  <option value="active">🟢 Active</option>
  <option value="cancelled">🔴 Cancelled</option>
  <option value="completed">⚪ Completed</option>
</select>
```

**Features:**
- ✅ Changes color based on selection
- ✅ Smooth transitions
- ✅ Disabled state when updating
- ✅ Cursor pointer on hover
- ✅ Border highlight

### Admin's Status Badge
```html
<span class="badge badge-status-active">
  active
</span>
```

**Features:**
- ✅ Read-only display
- ✅ Color-coded
- ✅ Capitalized text
- ✅ Pill-shaped design

## Icon Usage

### New Icons Added
- 📅 **Calendar**: Day of week
- 🕐 **Clock**: Time range
- 👤 **User**: Teacher name
- ✏️ **Edit**: Edit button (Admin)
- 🗑️ **Trash**: Delete button (Admin)

## Table Layout

### Enhanced Design
```
┌──────────────────────────────────────────────────────────────┐
│  Course Name    │ Level Badge │ 📅 Day │ 🕐 Time │ Status    │
├──────────────────────────────────────────────────────────────┤
│  Korean Basic   │ [Beginner]  │ Mon    │ 9:00am  │ [Active▼] │
│  (bold text)    │ (blue)      │ (icon) │ (icon)  │ (dropdown)│
└──────────────────────────────────────────────────────────────┘
```

## Color Palette

### Status Colors
| Status    | Background | Text    | Border  | Icon |
|-----------|-----------|---------|---------|------|
| Active    | Green-50  | Green-700| Green-200| 🟢 |
| Cancelled | Red-50    | Red-700 | Red-200 | 🔴 |
| Completed | Gray-50   | Gray-700| Gray-200| ⚪ |

### Action Colors
| Action | Color | Hover |
|--------|-------|-------|
| Edit   | Pink-600 | Pink-50 BG |
| Delete | Red-600  | Red-50 BG |

## Responsive Design

### Desktop (> 1024px)
- Full table visible
- All columns shown
- Dropdown full width

### Tablet (768px - 1024px)
- Table scrolls horizontally
- Icons help save space
- Dropdown adapts

### Mobile (< 768px)
- Card layout (future enhancement)
- Stacked information
- Large touch targets

## Interaction States

### 1. Default State
```
Status: Active ▼
(Green background, clickable)
```

### 2. Hover State
```
Status: Active ▼
(Darker green background)
```

### 3. Open State
```
Status: [Active  ]
        Cancelled 
        Completed 
(Dropdown open, options visible)
```

### 4. Loading State
```
Status: Active ▼
(Grayed out, cursor not-allowed)
```

### 5. Success State
```
✓ Status updated successfully
(Toast notification)
```

## Animation & Transitions

```css
/* Smooth color transitions */
transition: all 200ms ease-in-out

/* Hover scale effect */
transform: scale(1.02)

/* Loading spinner */
@keyframes spin {
  from { transform: rotate(0deg) }
  to { transform: rotate(360deg) }
}
```

## Accessibility Features

### Keyboard Navigation
- **Tab**: Move to dropdown
- **Space/Enter**: Open dropdown
- **Arrow Up/Down**: Navigate options
- **Enter**: Select option
- **Escape**: Close dropdown

### Screen Readers
```html
<select 
  aria-label="Update class status"
  aria-describedby="status-help"
>
  <option value="active">Active - Class is running</option>
  <option value="cancelled">Cancelled - Class is cancelled</option>
  <option value="completed">Completed - Class has finished</option>
</select>
```

## Loading Feedback

### When Status is Updating
```
[Updating...  ]
(Spinner icon, disabled state)
```

### Success Feedback
```
┌──────────────────────────────┐
│ ✓ Status updated successfully│
└──────────────────────────────┘
(Toast notification, 3 seconds)
```

### Error Feedback
```
┌──────────────────────────────┐
│ ✗ Failed to update status    │
└──────────────────────────────┘
(Red toast, 5 seconds)
```

## Example Use Cases

### Use Case 1: Teacher Cancels Class
```
1. Teacher sees: [Active ▼]
2. Clicks dropdown
3. Selects "Cancelled"
4. Dropdown changes to: [Cancelled ▼] (Red)
5. Toast: "✓ Status updated successfully"
6. Admin sees change immediately
```

### Use Case 2: Teacher Marks Complete
```
1. After class ends
2. Teacher opens dropdown
3. Selects "Completed"
4. Badge turns gray: [Completed ▼]
5. Entry moves to completed filter
```

### Use Case 3: Admin Views Updates
```
1. Admin refreshes page
2. Sees all teacher status updates
3. Can view history in activity logs
4. Can edit if needed
```

## CSS Classes Reference

```css
/* Status Dropdown (Teacher) */
.status-dropdown-active {
  bg-green-50 text-green-700 
  border-green-200 hover:bg-green-100
}

.status-dropdown-cancelled {
  bg-red-50 text-red-700 
  border-red-200 hover:bg-red-100
}

.status-dropdown-completed {
  bg-gray-50 text-gray-700 
  border-gray-200 hover:bg-gray-100
}

/* Status Badge (Admin) */
.badge-status-active {
  bg-green-100 text-green-800
}

.badge-status-cancelled {
  bg-red-100 text-red-800
}

.badge-status-completed {
  bg-gray-100 text-gray-800
}
```

## Testing Checklist

### Visual Testing
- [ ] Dropdown displays correct colors
- [ ] Icons render properly
- [ ] Table is responsive
- [ ] Hover effects work
- [ ] Loading state shows
- [ ] Toast notifications appear

### Functional Testing
- [ ] Teacher can change status
- [ ] Admin sees read-only badge
- [ ] Status persists after refresh
- [ ] Multiple teachers don't conflict
- [ ] Error handling works

### Accessibility Testing
- [ ] Keyboard navigation works
- [ ] Screen reader announces changes
- [ ] Color contrast meets WCAG AA
- [ ] Focus indicators visible

---

**Result**: A modern, intuitive, and accessible status update interface! 🎨✨

