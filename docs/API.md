# API Documentation

## Base URL

```
http://localhost:3001/api
```

## Authentication

Most endpoints require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <access_token>
```

## Endpoints

### Auth

#### POST /auth/login
Login and receive access/refresh tokens.

**Request:**
```json
{
  "email": "admin@koreanwithus.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "admin@koreanwithus.com",
      "firstName": "Admin",
      "lastName": "User",
      "roleId": 1,
      "roleName": "super_admin"
    },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

#### POST /auth/refresh
Refresh access token using refresh token.

**Request:**
```json
{
  "refreshToken": "..."
}
```

#### POST /auth/logout
Logout (requires authentication).

---

### Users

#### GET /users
List users with pagination and filters.

**Query Parameters:**
- `q` - Search query (email, name)
- `role` - Filter by role name
- `status` - Filter by status (active/suspended/archived)
- `page` - Page number (default: 1)
- `per_page` - Items per page (default: 20)
- `sort_by` - Sort field (default: created_at)
- `order` - Sort order (asc/desc, default: desc)

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 100,
    "total_pages": 5
  }
}
```

#### GET /users/:id
Get user details.

#### POST /users
Create new user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+65 1234 5678",
  "roleId": 4,
  "status": "active"
}
```

#### PUT /users/:id
Update user.

#### DELETE /users/:id
Soft delete user (sets status to 'archived').

---

### Courses

#### GET /courses
List courses.

**Query Parameters:**
- `q` - Search query
- `level` - Filter by level
- `active` - Filter by active status (true/false)
- `page`, `per_page` - Pagination

#### GET /courses/:id
Get course details.

#### POST /courses
Create course.

**Request:**
```json
{
  "title": "Beginner Korean A",
  "slug": "beginner-korean-a",
  "description": "Introduction to Korean language",
  "level": "Beginner",
  "capacity": 20,
  "price": 299.00,
  "currency": "SGD",
  "active": true
}
```

#### PUT /courses/:id
Update course.

#### DELETE /courses/:id
Archive course (sets active to false).

#### GET /courses/:id/schedules
Get schedules for a course.

#### POST /courses/:id/schedules
Create schedule for a course.

**Request:**
```json
{
  "teacherId": 2,
  "startTime": "2024-01-15T10:00:00Z",
  "endTime": "2024-01-15T12:00:00Z",
  "timezone": "Asia/Singapore",
  "capacity": 20,
  "location": "Zoom Link or Classroom",
  "status": "scheduled"
}
```

---

### Enrollments

#### GET /enrollments
List enrollments.

**Query Parameters:**
- `courseId` - Filter by course
- `userId` - Filter by user
- `status` - Filter by status (pending/approved/active/completed/cancelled)
- `paymentStatus` - Filter by payment status
- `dateFrom`, `dateTo` - Date range filter
- `page`, `per_page` - Pagination

#### GET /enrollments/:id
Get enrollment details.

#### POST /enrollments
Create enrollment.

**Request:**
```json
{
  "userId": 5,
  "courseId": 1,
  "scheduleId": 3,
  "notes": "Student requested evening class",
  "source": "admin"
}
```

#### PUT /enrollments/:id
Update enrollment.

#### POST /enrollments/:id/approve
Approve pending enrollment.

#### POST /enrollments/:id/reject
Reject enrollment.

**Request:**
```json
{
  "reason": "Course is full"
}
```

---

### Inquiries

#### GET /inquiries
List inquiries.

**Query Parameters:**
- `status` - Filter by status (new/pending/replied/closed)
- `assignedTo` - Filter by assigned user
- `priority` - Filter by priority
- `page`, `per_page` - Pagination

#### GET /inquiries/:id
Get inquiry with replies.

#### POST /inquiries
Create inquiry (public endpoint, no auth required).

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+65 1234 5678",
  "subject": "Course Inquiry",
  "message": "I'm interested in Beginner Korean A",
  "source": "website"
}
```

#### PUT /inquiries/:id
Update inquiry (status, assignedTo, priority).

#### POST /inquiries/:id/replies
Add reply to inquiry.

**Request:**
```json
{
  "message": "Thank you for your inquiry...",
  "isInternal": false
}
```

---

### Reports

#### GET /reports/enrollments
Get enrollment report.

**Query Parameters:**
- `start` - Start date (YYYY-MM-DD)
- `end` - End date (YYYY-MM-DD)
- `groupBy` - Group by day/month/year (default: day)

**Response:**
```json
{
  "success": true,
  "data": {
    "timeline": [
      {
        "period": "2024-01-15",
        "count": 10,
        "approved": 8,
        "pending": 2,
        "cancelled": 0
      }
    ],
    "courseBreakdown": [
      {
        "title": "Beginner Korean A",
        "enrollments": 25,
        "approved": 20
      }
    ]
  }
}
```

#### GET /reports/ai-summary
Get AI-generated summary.

**Query Parameters:**
- `period` - last_7_days / last_30_days / last_90_days

---

### Settings

#### GET /settings
Get all settings.

#### PUT /settings/:key
Update a setting.

**Request:**
```json
{
  "value": "New Site Title"
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "message": "Error message",
    "statusCode": 400
  }
}
```

## Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `500` - Internal Server Error

