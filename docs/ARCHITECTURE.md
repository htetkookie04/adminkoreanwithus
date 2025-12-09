# Architecture Overview

## System Architecture

```
┌─────────────┐
│   Frontend   │  React + Vite + TypeScript
│  (Port 5173) │  Tailwind CSS
└──────┬──────┘
       │ HTTP/REST
       │ JWT Auth
┌──────▼──────┐
│   Backend   │  Node.js + Express + TypeScript
│  (Port 3001) │  PostgreSQL Client
└──────┬──────┘
       │ SQL
┌──────▼──────┐
│  PostgreSQL  │  Relational Database
│  (Port 5432) │
└─────────────┘
```

## Frontend Architecture

### Structure

```
frontend/
├── src/
│   ├── components/     # Reusable UI components
│   │   ├── Layout.tsx
│   │   └── ProtectedRoute.tsx
│   ├── pages/          # Page components
│   │   ├── Dashboard.tsx
│   │   ├── Users.tsx
│   │   ├── Courses.tsx
│   │   └── ...
│   ├── store/          # State management (Zustand)
│   │   └── authStore.ts
│   ├── lib/            # Utilities and API client
│   │   └── api.ts
│   ├── App.tsx         # Root component with routing
│   └── main.tsx        # Entry point
```

### State Management

- **Zustand** for global state (auth, user session)
- **React Query** (optional) for server state caching
- Local component state for UI-only state

### Routing

- **React Router v6** for client-side routing
- Protected routes with authentication check
- Nested routes with Layout component

### API Communication

- **Axios** for HTTP requests
- Automatic token injection via interceptors
- Automatic token refresh on 401 errors
- Centralized error handling

## Backend Architecture

### Structure

```
backend/
├── src/
│   ├── controllers/    # Request handlers
│   │   ├── authController.ts
│   │   ├── usersController.ts
│   │   └── ...
│   ├── routes/         # Route definitions
│   │   ├── auth.ts
│   │   ├── users.ts
│   │   └── ...
│   ├── middleware/     # Express middleware
│   │   ├── auth.ts
│   │   └── errorHandler.ts
│   ├── db.ts           # Database connection
│   └── index.ts        # Express app setup
```

### Request Flow

1. **Request** → Express middleware (CORS, body parser, auth)
2. **Route** → Matches route pattern
3. **Middleware** → Authentication & authorization checks
4. **Controller** → Business logic, database queries
5. **Response** → JSON response or error

### Authentication Flow

1. User submits credentials → `POST /api/auth/login`
2. Backend validates credentials → Checks database
3. Backend generates JWT tokens → Access token (15m) + Refresh token (7d)
4. Frontend stores tokens → localStorage (via Zustand persist)
5. Frontend includes token → `Authorization: Bearer <token>` header
6. Backend validates token → JWT middleware on protected routes
7. Token expires → Frontend uses refresh token to get new access token

### Database Layer

- **pg** (node-postgres) for PostgreSQL connection
- Connection pooling for performance
- Parameterized queries to prevent SQL injection
- Transaction support for complex operations

## Database Schema

### Core Entities

- **users** - All system users (admins, teachers, students)
- **roles** - User roles (super_admin, admin, teacher, etc.)
- **permissions** - Fine-grained permissions
- **courses** - Course catalog
- **schedules** - Class instances/batches
- **enrollments** - Student enrollments
- **payments** - Payment transactions
- **inquiries** - Contact form submissions
- **activity_logs** - Audit trail

### Relationships

- Users ↔ Enrollments ↔ Courses (many-to-many via enrollments)
- Courses → Schedules (one-to-many)
- Enrollments → Payments (one-to-many)
- Users → Activity Logs (one-to-many)

## Security

### Authentication

- JWT tokens with expiration
- Refresh token rotation
- Secure password hashing (bcrypt)
- Password reset flow (to be implemented)

### Authorization

- Role-based access control (RBAC)
- Permission-based fine-grained control
- Middleware checks on protected routes
- Resource-level permissions

### Data Protection

- Parameterized SQL queries (SQL injection prevention)
- Input validation (Zod schemas)
- CORS configuration
- Helmet.js security headers
- Rate limiting (to be implemented)

## API Design

### RESTful Principles

- Resource-based URLs (`/api/users`, `/api/courses`)
- HTTP methods (GET, POST, PUT, DELETE)
- Status codes (200, 201, 400, 401, 404, 500)
- Consistent response format

### Response Format

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "pagination": { ... } // if applicable
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "message": "Error message",
    "statusCode": 400
  }
}
```

## Future Enhancements

### AI Integration

- Backend service for AI calls (OpenAI/Anthropic)
- Prompt templates for different use cases
- Caching of AI responses
- Rate limiting for AI endpoints

### Real-time Features

- WebSocket support for live updates
- Real-time notifications
- Live chat for support

### Performance

- Redis caching layer
- Database query optimization
- CDN for static assets
- Image optimization

### Monitoring

- Error tracking (Sentry)
- Performance monitoring
- Analytics dashboard
- Log aggregation

