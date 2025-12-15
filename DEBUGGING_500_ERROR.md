# Debugging 500 Internal Server Error - Courses/Lectures Endpoints

## Overview
This guide helps identify and resolve 500 Internal Server Errors when loading courses or lectures on the Korean With Us dashboard.

## Quick Diagnosis Steps

### 1. Check Backend Server Logs
The most critical step is to check your backend server console/terminal output. The error handler logs errors to the console.

**What to look for:**
```bash
# In your backend terminal, you should see:
Unexpected error: [Error details]
Error stack: [Stack trace]
```

**Common log locations:**
- **Local development**: Terminal/console where you ran `npm run dev` or `npm start`
- **Production (Render)**: Render dashboard → Your service → Logs tab
- **Production (other platforms)**: Check platform-specific logging (PM2 logs, Docker logs, etc.)

### 2. Check Network Tab Details
In browser DevTools → Network tab:
1. Click on the failed request (status 500)
2. Go to the **Response** tab to see the error message
3. Go to the **Headers** tab to verify the request URL and headers
4. Check **Preview** tab for formatted error response

**Expected error response format:**
```json
{
  "success": false,
  "message": "Error message here",
  "error": {
    "message": "Error message here",
    "statusCode": 500
  }
}
```

## Common Root Causes

### 1. Database Connection Issues

**Symptoms:**
- Error messages mentioning "connection", "timeout", "ECONNREFUSED"
- Prisma errors like "Can't reach database server"

**Diagnosis:**
```bash
# Check database connection
cd backend
node verify-database.js
```

**Common fixes:**
- Verify `DATABASE_URL` in `backend/.env` is correct
- Check if PostgreSQL is running: `pg_isready` or check service status
- Verify database credentials (host, port, database name, user, password)
- Check firewall/network rules if using remote database
- For cloud databases (Neon, Supabase, etc.), verify SSL settings:
  ```env
  DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
  ```

### 2. Prisma Client Issues

**Symptoms:**
- Errors mentioning "PrismaClient", "schema", or "migration"
- "Unknown arg" or "Invalid value" errors

**Diagnosis:**
```bash
cd backend
# Regenerate Prisma Client
npx prisma generate

# Check if migrations are applied
npx prisma migrate status

# Apply pending migrations
npx prisma migrate deploy
```

**Common fixes:**
- Run `npx prisma generate` after schema changes
- Ensure migrations are up to date: `npx prisma migrate deploy`
- Check `backend/prisma/schema.prisma` for syntax errors
- Verify Prisma Client is installed: `npm list @prisma/client`

### 3. Missing Environment Variables

**Symptoms:**
- Errors mentioning "JWT_SECRET", "DATABASE_URL", or undefined variables
- Authentication failures

**Required environment variables:**
```env
# backend/.env
DATABASE_URL=postgresql://user:password@host:5432/database
JWT_SECRET=your-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-here
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
NODE_ENV=development
PORT=3001
```

**Diagnosis:**
```bash
cd backend
# Check if .env file exists
ls -la .env

# Verify variables are loaded (don't commit this!)
node -e "require('dotenv').config(); console.log(process.env.DATABASE_URL ? 'DATABASE_URL: Set' : 'DATABASE_URL: Missing')"
```

### 4. Authentication/Authorization Issues

**Symptoms:**
- 500 errors when accessing protected routes
- Errors mentioning "token", "JWT", or "permission"

**Diagnosis:**
1. Check browser DevTools → Application → Cookies/LocalStorage
2. Verify token is being sent in request headers:
   ```
   Authorization: Bearer <token>
   ```
3. Check if token is expired (try logging out and back in)

**Common fixes:**
- Ensure `JWT_SECRET` is set in backend `.env`
- Verify token is included in API requests (check `frontend/src/lib/api.ts`)
- Check if user role has required permissions

### 5. Database Schema Mismatches

**Symptoms:**
- Errors mentioning "column", "table", "relation", or "does not exist"
- Prisma query errors

**Diagnosis:**
```bash
cd backend
# Check migration status
npx prisma migrate status

# View current database schema
npx prisma db pull

# Compare with schema.prisma
npx prisma validate
```

**Common fixes:**
- Run pending migrations: `npx prisma migrate deploy`
- Reset database (development only): `npx prisma migrate reset`
- Check for missing tables/columns in database

### 6. Missing Database Tables/Relations

**Symptoms:**
- Errors mentioning specific table names (courses, lectures, enrollments, etc.)
- "relation does not exist" errors

**Diagnosis:**
```bash
cd backend
# Connect to database and list tables
psql $DATABASE_URL -c "\dt"

# Or use Prisma Studio
npx prisma studio
```

**Common fixes:**
- Ensure all migrations are applied
- Check `backend/prisma/migrations/` for missing migrations
- Verify foreign key relationships exist

### 7. Type/Data Validation Errors

**Symptoms:**
- Errors when parsing courseId or other parameters
- Zod validation errors (if using validation)

**Diagnosis:**
- Check backend logs for validation errors
- Verify request parameters in Network tab
- Check controller code for type mismatches

**Example issue:**
```typescript
// If courseId is undefined or NaN
const courseId = parseInt(req.params.courseId); // Could be NaN
if (isNaN(courseId)) {
  // Should throw 400, but might cause 500 if not handled
}
```

## Debugging Tools & Methods

### 1. Enhanced Backend Logging

Add detailed logging to controllers:

```typescript
// In coursesController.ts or lecturesController.ts
export const getCourses = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    console.log('[getCourses] Request received:', {
      query: req.query,
      user: req.user?.id,
      role: req.user?.roleName
    });
    
    // ... existing code ...
    
  } catch (error) {
    console.error('[getCourses] Error:', error);
    console.error('[getCourses] Error stack:', error instanceof Error ? error.stack : 'No stack');
    next(error);
  }
};
```

### 2. Database Query Logging

Prisma already logs queries in development. To see them:
```env
# backend/.env
NODE_ENV=development
```

Prisma will log all queries, errors, and warnings to console.

### 3. Test API Endpoints Directly

Use curl or Postman to test endpoints:

```bash
# Get auth token first (login)
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'

# Use token to test courses endpoint
curl http://localhost:3001/api/courses \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Test lectures endpoint
curl http://localhost:3001/api/lectures \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 4. Check Prisma Client Connection

```bash
cd backend
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$connect()
  .then(() => {
    console.log('✅ Prisma connected successfully');
    return prisma.\$disconnect();
  })
  .catch(err => {
    console.error('❌ Prisma connection failed:', err);
    process.exit(1);
  });
"
```

### 5. Verify Database Tables Exist

```bash
cd backend
# Using Prisma
npx prisma db execute --stdin <<< "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"

# Or connect directly
psql $DATABASE_URL -c "\dt"
```

### 6. Check for Missing Relations

```bash
cd backend
npx prisma studio
# Opens browser UI to inspect database
```

## Step-by-Step Debugging Workflow

### Step 1: Reproduce the Error
1. Open browser DevTools (F12)
2. Go to Network tab
3. Navigate to Lectures page
4. Note the exact endpoint that fails (e.g., `/api/courses/1` or `/api/lectures/course/1`)

### Step 2: Check Backend Logs
1. Look at backend server console/terminal
2. Find the error message and stack trace
3. Note the error type (database, Prisma, validation, etc.)

### Step 3: Verify Database Connection
```bash
cd backend
node verify-database.js
```

### Step 4: Check Environment Variables
```bash
cd backend
# Ensure .env file exists and has all required variables
cat .env | grep -E "(DATABASE_URL|JWT_SECRET)"
```

### Step 5: Test Endpoint Directly
Use curl or Postman to test the failing endpoint with proper authentication.

### Step 6: Check Database State
```bash
cd backend
npx prisma studio
# Verify courses and lectures tables exist and have data
```

### Step 7: Review Code
Check the specific controller function handling the request:
- `backend/src/controllers/coursesController.ts` - `getCourse()` or `getCourses()`
- `backend/src/controllers/lecturesController.ts` - `getLecturesByCourse()`

Look for:
- Missing error handling
- Type mismatches
- Database query issues
- Missing null checks

## Common Fixes

### Fix 1: Database Not Connected
```bash
# Restart PostgreSQL service
# Windows:
net stop postgresql-x64-XX
net start postgresql-x64-XX

# Linux/Mac:
sudo systemctl restart postgresql
# or
brew services restart postgresql
```

### Fix 2: Prisma Client Out of Sync
```bash
cd backend
npx prisma generate
npm restart
```

### Fix 3: Missing Migrations
```bash
cd backend
npx prisma migrate deploy
```

### Fix 4: Environment Variables Not Loaded
```bash
cd backend
# Ensure .env file is in backend/ directory
# Restart backend server after adding variables
```

### Fix 5: Clear and Regenerate Database (Development Only)
```bash
cd backend
# WARNING: This deletes all data!
npx prisma migrate reset
npx prisma db seed
```

## Prevention: Better Error Handling

Consider improving error handling in controllers:

```typescript
// Example: Better error logging
catch (error: any) {
  console.error(`[${functionName}] Error:`, {
    message: error.message,
    code: error.code,
    stack: error.stack,
    request: {
      params: req.params,
      query: req.query,
      user: req.user?.id
    }
  });
  next(error);
}
```

## Getting Help

When reporting issues, include:
1. **Backend error logs** (full stack trace)
2. **Network tab details** (request URL, headers, response)
3. **Environment** (local/production, Node version, database type)
4. **Steps to reproduce** (exact actions that trigger the error)
5. **Recent changes** (migrations, code changes, environment changes)

## Quick Reference: Check Commands

```bash
# 1. Check database connection
cd backend && node verify-database.js

# 2. Check Prisma status
cd backend && npx prisma migrate status

# 3. Regenerate Prisma Client
cd backend && npx prisma generate

# 4. View database in browser
cd backend && npx prisma studio

# 5. Check backend logs
# (Look at terminal where backend is running)

# 6. Test API endpoint
curl http://localhost:3001/api/health
```

