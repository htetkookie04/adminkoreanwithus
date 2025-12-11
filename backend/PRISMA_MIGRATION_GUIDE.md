# Prisma Migration Guide

This guide explains how to migrate from mock arrays to Prisma database persistence.

## What Changed

- ✅ All mock arrays removed (`mockUsers`, `mockCourses`, `mockEnrollments`, `mockLectures`, `mockTimetable`, `mockGallery`, `mockSchedules`)
- ✅ All `MOCK_MODE` environment variable checks removed
- ✅ All SQL queries replaced with Prisma ORM queries
- ✅ Complete Prisma schema created matching existing database structure
- ✅ Activity logging now uses Prisma
- ✅ All CRUD operations persist to PostgreSQL database

## Setup Steps

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Database

Create a `.env` file in the `backend` directory:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/korean_with_us"
JWT_SECRET="your-secret-key-here"
JWT_REFRESH_SECRET="your-refresh-secret-key-here"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=3001
CORS_ORIGIN="http://localhost:5173"
```

**Important:** Remove any `MOCK_MODE` variable from `.env` if it exists.

### 3. Generate Prisma Client

```bash
npm run prisma:generate
```

This generates the Prisma client based on the schema.

### 4. Run Database Migrations

**Option A: Use Prisma Migrate (Recommended)**

```bash
npm run prisma:migrate
```

This will:
- Create migration files in `prisma/migrations/`
- Apply migrations to your database
- Sync Prisma schema with database

**Option B: Use Existing SQL Migrations**

If you prefer to use the existing SQL migration files:

```bash
psql -d korean_with_us -f database/migrations/001_initial_schema.sql
psql -d korean_with_us -f database/migrations/002_timetable_schema.sql
psql -d korean_with_us -f database/migrations/003_gallery_schema.sql
psql -d korean_with_us -f database/migrations/004_lectures_schema.sql
psql -d korean_with_us -f database/migrations/005_add_pdf_to_lectures.sql
psql -d korean_with_us -f database/migrations/006_make_video_url_nullable.sql
```

Then generate Prisma client:

```bash
npm run prisma:generate
```

### 5. Seed Database

Run the seed script to populate initial data (roles and admin user):

```bash
npm run prisma:seed
```

This creates:
- All default roles (super_admin, admin, teacher, etc.)
- Default admin user:
  - Email: `admin@koreanwithus.com`
  - Password: `admin123`
  - **⚠️ CHANGE THIS PASSWORD IN PRODUCTION!**

### 6. Start Backend Server

```bash
npm run dev
```

The server will connect to PostgreSQL and all data will persist.

## Verification

1. **Test Login**: Login with `admin@koreanwithus.com` / `admin123`
2. **Create Data**: Create a user, course, enrollment, etc.
3. **Logout and Login Again**: Data should still exist
4. **Restart Server**: Data should persist after restart
5. **Check Dashboard**: Dashboard charts should show real statistics

## Prisma Studio (Database GUI)

To view and edit data in a GUI:

```bash
npm run prisma:studio
```

This opens Prisma Studio at `http://localhost:5555`

## Troubleshooting

### "Prisma Client not generated"

Run: `npm run prisma:generate`

### "Database connection error"

- Check `.env` file has correct `DATABASE_URL`
- Ensure PostgreSQL is running
- Verify database exists: `createdb korean_with_us`

### "Migration failed"

- Check database permissions
- Ensure all SQL migrations have been run
- Try: `npx prisma migrate reset` (⚠️ This deletes all data!)

### "Schema mismatch"

If Prisma schema doesn't match database:
- Run: `npx prisma db pull` to sync schema from database
- Or manually update `prisma/schema.prisma` to match database

## Files Changed

### Created
- `backend/prisma/schema.prisma` - Complete Prisma schema
- `backend/src/lib/prisma.ts` - Prisma client singleton
- `backend/prisma/seed.ts` - Database seeding script

### Modified
- All controller files - Now use Prisma instead of SQL/mock arrays
- `backend/src/db.ts` - Removed MOCK_MODE check
- `backend/package.json` - Added Prisma scripts
- `backend/src/routes/users.ts` - Removed debugMockUsers route

## Next Steps

1. ✅ All data now persists to PostgreSQL
2. ✅ No more mock arrays or MOCK_MODE
3. ✅ All CRUD operations use Prisma
4. ✅ Dashboard shows real statistics
5. ✅ Data survives logout/login and server restart

## Production Checklist

- [ ] Change default admin password
- [ ] Set strong JWT secrets
- [ ] Configure proper CORS origins
- [ ] Set up database backups
- [ ] Configure environment variables securely
- [ ] Remove seed script or secure it
- [ ] Set up proper logging
- [ ] Configure file upload limits
- [ ] Set up cloud storage for uploads (optional)

