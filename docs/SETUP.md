# Setup Guide

Complete setup instructions for the Korean With Us Admin Dashboard.

## Prerequisites

- **Node.js** 18+ and npm/yarn
- **PostgreSQL** 14+
- **Git**

## Step 1: Database Setup

1. Create a PostgreSQL database:

```bash
createdb korean_with_us
```

Or using psql:

```sql
CREATE DATABASE korean_with_us;
```

2. Run the migration:

```bash
cd database
psql -d korean_with_us -f migrations/001_initial_schema.sql
```

3. Verify the schema:

```bash
psql -d korean_with_us -c "\dt"
```

You should see all the tables created.

## Step 2: Backend Setup

1. Navigate to backend directory:

```bash
cd backend
```

2. Install dependencies:

```bash
npm install
```

3. Create environment file:

```bash
cp .env.example .env
```

4. Edit `.env` with your configuration:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=korean_with_us
DB_USER=postgres
DB_PASSWORD=your_password

# JWT Secrets (generate strong random strings)
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key

# CORS
CORS_ORIGIN=http://localhost:5173
```

5. Generate JWT secrets (optional):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

6. Start the backend:

```bash
npm run dev
```

The backend should be running on `http://localhost:3001`

## Step 3: Frontend Setup

1. Navigate to frontend directory:

```bash
cd frontend
```

2. Install dependencies:

```bash
npm install
```

3. Create environment file:

```bash
cp .env.example .env
```

4. Edit `.env`:

```env
VITE_API_URL=http://localhost:3001
```

5. Start the frontend:

```bash
npm run dev
```

The frontend should be running on `http://localhost:5173`

## Step 4: Initial Login

1. The database migration creates a default admin user:
   - Email: `admin@koreanwithus.com`
   - Password: `admin123` (⚠️ **CHANGE THIS IN PRODUCTION!**)

2. Open `http://localhost:5173` in your browser

3. Login with the default credentials

4. **Immediately change the admin password** after first login!

## Step 5: Create Admin User (Alternative)

If you need to create a new admin user manually:

```sql
-- Generate password hash (use bcrypt in Node.js or online tool)
-- For 'admin123', the hash is: $2b$10$rOzJqZqZqZqZqZqZqZqZqOqZqZqZqZqZqZqZqZqZqZqZqZqZqZqZq

INSERT INTO users (email, password_hash, first_name, last_name, role_id, status)
VALUES (
  'admin@koreanwithus.com',
  '$2b$10$rOzJqZqZqZqZqZqZqZqZqOqZqZqZqZqZqZqZqZqZqZqZqZqZqZqZq',
  'Admin',
  'User',
  1, -- super_admin role_id
  'active'
);
```

Or use Node.js to generate a proper hash:

```javascript
const bcrypt = require('bcrypt');
const hash = bcrypt.hashSync('your-password', 10);
console.log(hash);
```

## Development Workflow

### Backend

- **Dev server**: `npm run dev` (uses tsx for hot reload)
- **Build**: `npm run build` (compiles TypeScript)
- **Start production**: `npm start` (runs compiled code)

### Frontend

- **Dev server**: `npm run dev` (Vite dev server with HMR)
- **Build**: `npm run build` (production build)
- **Preview**: `npm run preview` (preview production build)

## Troubleshooting

### Database Connection Issues

- Verify PostgreSQL is running: `pg_isready`
- Check connection string in `.env`
- Ensure database exists: `psql -l | grep korean_with_us`

### Port Already in Use

- Backend: Change `PORT` in `backend/.env`
- Frontend: Change port in `frontend/vite.config.ts`

### CORS Errors

- Ensure `CORS_ORIGIN` in backend `.env` matches frontend URL
- Check browser console for specific CORS error messages

### JWT Token Issues

- Verify `JWT_SECRET` and `JWT_REFRESH_SECRET` are set
- Clear browser localStorage if tokens are corrupted
- Check token expiration settings

## Next Steps

1. **Configure Email**: Set up SMTP settings in Settings page
2. **Add Payment Gateway**: Configure Stripe or other payment provider
3. **Set up AI Integration**: Add OpenAI/Anthropic API keys for AI features
4. **Configure File Storage**: Set up S3 or Cloudinary for media uploads
5. **Set up Monitoring**: Configure Sentry for error tracking

## Production Deployment

See `docs/DEPLOYMENT.md` (to be created) for production deployment instructions.

