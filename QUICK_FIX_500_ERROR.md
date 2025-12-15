# Quick Fix Guide: 500 Internal Server Error

## 🚨 Immediate Actions

### Step 1: Check Backend Logs (MOST IMPORTANT)
**Look at your backend server terminal/console** - this will show the exact error.

**What you'll see:**
```
═══════════════════════════════════════════════════════
❌ UNEXPECTED ERROR: [error message]
📍 Error Type: [error type]
📍 Request URL: /api/courses/1
...
═══════════════════════════════════════════════════════
```

### Step 2: Run Diagnostic Script
```bash
cd backend
node debug-500-error.js
```

This will check:
- ✅ Environment variables
- ✅ Database connection
- ✅ Required tables exist
- ✅ Prisma Client working
- ✅ Sample queries work

### Step 3: Check Network Tab Response
1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Click the failed request (red, status 500)
4. Check **Response** tab for error details

## 🔧 Common Quick Fixes

### Fix 1: Database Not Connected
```bash
# Check if PostgreSQL is running
# Windows:
sc query postgresql-x64-XX

# Linux/Mac:
sudo systemctl status postgresql
# or
brew services list | grep postgresql

# Restart if needed
```

### Fix 2: Missing Environment Variables
```bash
cd backend
# Check if .env exists
ls -la .env

# Verify DATABASE_URL is set
node -e "require('dotenv').config(); console.log(process.env.DATABASE_URL ? 'OK' : 'MISSING')"
```

### Fix 3: Prisma Client Out of Sync
```bash
cd backend
npx prisma generate
# Restart backend server
```

### Fix 4: Missing Database Migrations
```bash
cd backend
npx prisma migrate status
npx prisma migrate deploy
```

### Fix 5: Database Tables Missing
```bash
cd backend
# View database in browser
npx prisma studio

# Or check tables directly
psql $DATABASE_URL -c "\dt"
```

## 📋 Checklist

- [ ] Backend server is running
- [ ] Backend logs show error details
- [ ] Database is running and accessible
- [ ] `DATABASE_URL` is set in `backend/.env`
- [ ] `JWT_SECRET` is set in `backend/.env`
- [ ] Prisma Client is generated (`npx prisma generate`)
- [ ] Migrations are applied (`npx prisma migrate deploy`)
- [ ] Required tables exist (Course, Lecture, User, Enrollment)
- [ ] Authentication token is valid (try logging out/in)

## 🎯 Most Likely Causes (in order)

1. **Database connection failed** - Check `DATABASE_URL` and PostgreSQL status
2. **Missing environment variables** - Check `backend/.env` file
3. **Prisma Client not generated** - Run `npx prisma generate`
4. **Missing database migrations** - Run `npx prisma migrate deploy`
5. **Database tables don't exist** - Check with `npx prisma studio`
6. **Invalid authentication token** - Log out and log back in

## 📞 Still Stuck?

1. **Share backend logs** - Copy the error from backend terminal
2. **Share Network tab response** - Copy the error response from browser
3. **Run diagnostic script** - Share output of `node debug-500-error.js`
4. **Check DEBUGGING_500_ERROR.md** - Detailed troubleshooting guide

## 🔍 What Changed?

I've enhanced error logging to make debugging easier:

1. **Better error messages** in backend logs
2. **Detailed request context** (URL, params, user info)
3. **Prisma error detection** (identifies database issues)
4. **Diagnostic script** (`backend/debug-500-error.js`)
5. **Enhanced logging** in controllers

**Next time you see a 500 error, check the backend logs first!**

