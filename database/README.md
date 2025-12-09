# Database Schema

This directory contains PostgreSQL migration files and schema documentation.

## Migration Files

- `001_initial_schema.sql` - Initial database schema with all tables, indexes, and triggers

## Running Migrations

### Using psql

```bash
psql -d korean_with_us -f migrations/001_initial_schema.sql
```

### Using a migration tool

If you prefer using a migration tool like `node-pg-migrate` or `knex`, you can convert the SQL files accordingly.

## Schema Overview

### Core Tables

- **roles** - User roles (super_admin, admin, course_manager, etc.)
- **permissions** - Fine-grained permissions
- **role_permissions** - Many-to-many relationship between roles and permissions
- **users** - All users (admins, teachers, students)
- **courses** - Course catalog
- **schedules** - Class instances/batches
- **enrollments** - Student enrollments in courses/schedules
- **payments** - Payment transactions
- **inquiries** - Contact form submissions and support tickets
- **inquiry_replies** - Threaded replies to inquiries
- **feedback** - Student reviews/ratings
- **media** - Uploaded files (PDFs, videos, images)
- **activity_logs** - Audit trail
- **ai_reports** - AI-generated insights and summaries
- **settings** - System configuration
- **waitlist** - Course waitlist management

## ERD Relationships

- `users` (1) ←─ (N) `enrollments` (N) ─→ (1) `courses`
- `courses` (1) ←─ (N) `schedules`
- `schedules` (1) ←─ (N) `enrollments`
- `enrollments` (1) ←─ (N) `payments`
- `users` (1) ←─ (N) `feedback` → (1) `courses`
- `users` (1) ←─ (N) `activity_logs`
- `users` (1) ←─ (N) `inquiries` (assigned_to)
- `inquiries` (1) ←─ (N) `inquiry_replies`

## Indexes

All foreign keys and commonly queried fields are indexed for performance:
- Email lookups
- Status filters
- Date range queries
- Resource relationships

## Notes

- All timestamps use `TIMESTAMP WITH TIME ZONE`
- Soft deletes use `status` fields (e.g., 'archived') rather than hard deletes
- `updated_at` is automatically maintained by triggers
- Use `ON DELETE SET NULL` for historical records that shouldn't cascade
- Use `ON DELETE CASCADE` for dependent records that should be removed

