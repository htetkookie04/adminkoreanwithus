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
   ```

2. **Backend:**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your database credentials
   npm run dev
   ```

3. **Frontend:**
   ```bash
   cd frontend
   npm install
   cp .env.example .env
   npm run dev
   ```

4. **Login:**
   - Open http://localhost:5173
   - Email: `admin@koreanwithus.com`
   - Password: `admin123` (⚠️ Change immediately!)

## Features

- ✅ Role-based access control (Super Admin, Admin, Course Manager, Support, Viewer)
- ✅ User & student management
- ✅ Course & schedule management
- ✅ Enrollment workflow (pending → approved → active)
- ✅ Payment tracking
- ✅ Inquiries & support inbox
- ✅ Analytics & reports
- ✅ AI-powered insights and suggestions
- ✅ Activity logging & audit trail

## Documentation

- **[Setup Guide](docs/SETUP.md)** - Complete setup instructions
- **[API Documentation](docs/API.md)** - All API endpoints
- **[Architecture](docs/ARCHITECTURE.md)** - System architecture overview
- **[Database Schema](database/README.md)** - Database structure and relationships

## License

Proprietary — Korean With Us

