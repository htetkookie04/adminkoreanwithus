# Korean With Us — Admin Dashboard

Complete admin dashboard for managing users, courses, enrollments, content, communications, and analytics with AI-powered insights.

## Project Structure

```
.
├── backend/          # Node.js + Express + TypeScript API
├── frontend/         # React + Vite + TypeScript Dashboard
├── database/         # PostgreSQL migrations and schema
└── docs/            # Additional documentation
```

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Recharts
- **Backend:** Node.js, Express, TypeScript, PostgreSQL
- **Auth:** JWT with refresh tokens
- **Database:** PostgreSQL
- **AI:** OpenAI/Anthropic integration (backend only)

## Quick Start

See [docs/SETUP.md](docs/SETUP.md) for detailed setup instructions.

### Quick Setup (TL;DR)

1. **Database:**
   ```bash
   createdb korean_with_us
   psql -d korean_with_us -f database/migrations/001_initial_schema.sql
   psql -d korean_with_us -f database/migrations/002_timetable_schema.sql
   psql -d korean_with_us -f database/migrations/003_gallery_schema.sql
   psql -d korean_with_us -f database/migrations/004_lectures_schema.sql
   psql -d korean_with_us -f database/migrations/005_add_pdf_to_lectures.sql
   psql -d korean_with_us -f database/migrations/006_make_video_url_nullable.sql
   ```

2. **Backend:**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your database credentials
   # IMPORTANT: Do NOT set MOCK_MODE=true
   npm run dev
   ```

3. **Verify Database:**
   ```bash
   cd backend
   node verify-database.js
   ```

4. **Frontend:**
   ```bash
   cd frontend
   npm install
   cp .env.example .env
   npm run dev
   ```

5. **Login:**
   - Open http://localhost:5173
   - Email: `admin@koreanwithus.com`
   - Password: `admin123` (⚠️ Change immediately!)

## ⚠️ IMPORTANT: Database Mode

**To ensure data is saved to the database:**

1. **Check `.env` file** - Make sure `MOCK_MODE` is NOT set to `true`
2. **Verify connection** - Look for "✅ Database connected" in backend logs
3. **Run migrations** - Execute all SQL migration files
4. **Test CRUD** - Create a user/course and verify it persists after logout/login

See [FIXES_APPLIED.md](FIXES_APPLIED.md) for detailed information about recent fixes.

## Features

- ✅ Role-based access control (Super Admin, Admin, Course Manager, Support, Viewer)
- ✅ User & student management (Create, Read, Update, Delete)
- ✅ Course & schedule management
- ✅ Enrollment workflow (pending → approved → active)
- ✅ Payment tracking
- ✅ Activity logging & audit trail
- ✅ User search and filtering
- ✅ Pagination for large datasets

## Documentation

- **[Setup Guide](docs/SETUP.md)** - Complete setup instructions
- **[API Documentation](docs/API.md)** - All API endpoints
- **[Architecture](docs/ARCHITECTURE.md)** - System architecture overview
- **[Database Schema](database/README.md)** - Database structure and relationships

## License

Proprietary — Korean With Us

