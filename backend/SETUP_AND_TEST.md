# Database Setup and Testing Guide

## Prerequisites

1. **PostgreSQL must be running** on `localhost:5432`
2. **Database must exist**: `korean_with_us`
3. **Environment variables** must be configured

## Step 1: Create Database (if not exists)

```bash
# Using createdb command
createdb korean_with_us

# OR using psql
psql -U postgres -c "CREATE DATABASE korean_with_us;"
```

## Step 2: Configure Environment Variables

Create `backend/.env` file with:

```env
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/korean_with_us?schema=public"

# Alternative individual settings (used by db.ts)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=korean_with_us
DB_USER=postgres
DB_PASSWORD=your_password

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production-min-32-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Server Configuration
PORT=3001
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
```

**Important:** Replace `your_password` with your actual PostgreSQL password.

## Step 3: Run Database Migrations

You have two options:

### Option A: Use Existing SQL Migrations (Recommended)

Since you already have SQL migration files, use them:

```bash
cd database/migrations
psql -d korean_with_us -f 001_initial_schema.sql
psql -d korean_with_us -f 002_timetable_schema.sql
psql -d korean_with_us -f 003_gallery_schema.sql
psql -d korean_with_us -f 004_lectures_schema.sql
psql -d korean_with_us -f 005_add_pdf_to_lectures.sql
psql -d korean_with_us -f 006_make_video_url_nullable.sql
```

Then sync Prisma schema with database:

```bash
cd backend
npx prisma db pull
npx prisma generate
```

### Option B: Use Prisma Migrations

```bash
cd backend
npx prisma migrate dev --name init
```

This will create migration files and apply them to the database.

## Step 4: Seed Database

Run the seed script to create default roles and admin user:

```bash
cd backend
npm run prisma:seed
```

This creates:
- All default roles
- Admin user: `admin@koreanwithus.com` / `admin123`

## Step 5: Start Backend Server

```bash
cd backend
npm run dev
```

You should see:
```
✅ Database connected
🚀 Server running on http://localhost:3001
```

## Step 6: Test Data Persistence

### Test 1: Create Data

1. **Login** with `admin@koreanwithus.com` / `admin123`
2. **Create a user**:
   - Go to Users page
   - Click "+Add User"
   - Fill in email, password, name, role
   - Save
3. **Create a course**:
   - Go to Courses page
   - Click "+Add Course"
   - Fill in title, slug, description, etc.
   - Save
4. **Create an enrollment**:
   - Go to Enrollments page
   - Click "+Add Enrollment"
   - Select user and course
   - Save
5. **Create a lecture**:
   - Go to Lectures page
   - Click "+Add Lecture"
   - Upload video/PDF, fill in details
   - Save
6. **Create a timetable entry**:
   - Go to Timetable page
   - Click "+Add Entry"
   - Fill in course, day, time, teacher
   - Save

### Test 2: Verify Data Persists After Logout

1. **Logout** from the application
2. **Login again** with same credentials
3. **Verify**:
   - ✅ All created users appear in Users list
   - ✅ All created courses appear in Courses list
   - ✅ All enrollments appear in Enrollments list
   - ✅ All lectures appear in Lectures list
   - ✅ All timetable entries appear in Timetable list

### Test 3: Verify Data Persists After Server Restart

1. **Stop the backend server** (Ctrl+C)
2. **Restart the backend server**:
   ```bash
   npm run dev
   ```
3. **Login** again
4. **Verify**:
   - ✅ All previously created data still exists
   - ✅ Dashboard shows correct statistics
   - ✅ Can edit/delete existing records

### Test 4: Verify New User Can Login

1. **Create a new user** via admin dashboard:
   - Email: `test@example.com`
   - Password: `test123`
   - Role: User
   - Save
2. **Logout** from admin account
3. **Login** with new user credentials:
   - Email: `test@example.com`
   - Password: `test123`
4. **Verify**:
   - ✅ Login successful
   - ✅ User sees appropriate dashboard/content based on role

### Test 5: Verify Dashboard Statistics

1. **Login** as admin
2. **Go to Dashboard**
3. **Verify**:
   - ✅ User count matches actual users in database
   - ✅ Course count matches actual courses
   - ✅ Enrollment count matches actual enrollments
   - ✅ Lecture count matches actual lectures
   - ✅ Timetable count matches actual entries
   - ✅ Charts show real data

## Troubleshooting

### "Can't reach database server"

- Ensure PostgreSQL is running: `pg_ctl status` or check services
- Verify connection details in `.env`
- Test connection: `psql -U postgres -d korean_with_us`

### "Prisma Client not generated"

```bash
cd backend
npx prisma generate
```

### "Migration failed"

- Check database permissions
- Ensure database exists
- Check PostgreSQL logs for errors

### "Schema mismatch"

If Prisma schema doesn't match database:

```bash
# Option 1: Pull schema from database
npx prisma db pull

# Option 2: Reset and migrate (⚠️ DELETES ALL DATA)
npx prisma migrate reset
npx prisma migrate dev
```

## Verification Checklist

- [ ] Database created and accessible
- [ ] Environment variables configured
- [ ] Migrations run successfully
- [ ] Seed script executed
- [ ] Backend server starts without errors
- [ ] Can login with admin credentials
- [ ] Can create users, courses, enrollments, lectures, timetable entries
- [ ] Data persists after logout/login
- [ ] Data persists after server restart
- [ ] New users can login
- [ ] Dashboard shows real statistics

## Success Indicators

✅ No "MOCK_MODE" messages in console
✅ "✅ Database connected" message appears
✅ Data visible in Prisma Studio: `npm run prisma:studio`
✅ All CRUD operations work
✅ Data survives logout/login
✅ Data survives server restart

