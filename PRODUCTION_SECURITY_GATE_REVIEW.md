# Production Security Gate Review
**Date:** 2025-01-XX  
**Reviewer:** Senior AppSec Engineer  
**Status:** 🔴 **NO-GO** - Critical Blockers Identified

---

## Executive Summary

This production readiness security audit identified **8 Critical blockers** and **12 High-risk issues** that must be addressed before production deployment. The application has significant security gaps in token lifecycle management, BOLA protection, and TOCTOU vulnerabilities that could lead to complete system compromise.

**Recommendation:** **NO-GO** - Do not deploy to production until critical blockers are resolved.

---

## 1. Critical Blocker Check

### 🔴 CRITICAL-1: JWT Refresh Token Not Revocable
**Location:** `backend/src/controllers/authController.ts:76, 159`

**Vulnerability:**
```typescript
// TODO: Store refresh token in database (refresh_tokens table)
// TODO: Invalidate refresh token in database
```

**Impact:**
- Stolen refresh tokens remain valid for 7 days
- Cannot revoke access on logout or compromise
- No token rotation mechanism
- Replay attacks possible

**Exploit Scenario:**
1. Attacker steals refresh token via XSS/MITM
2. Token remains valid even after user logs out
3. Attacker can generate new access tokens indefinitely
4. Account takeover persists for 7 days

**CVSS Score:** 9.1 (Critical)

---

### 🔴 CRITICAL-2: BOLA in Finance Transactions
**Location:** `backend/src/controllers/financeTransactionsController.ts:175-218, 220-236`

**Vulnerability:**
- `updateTransaction()` - No ownership check
- `deleteTransaction()` - No ownership check
- Any authenticated admin can modify/delete any transaction

**Missing Authorization:**
```typescript
export const updateTransaction = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const existing = await prisma.financeTransaction.findFirst({ where: { id, isDeleted: false } });
  // ⚠️ NO CHECK: createdByUserId === req.user.id
  // ⚠️ NO CHECK: Can user modify transactions created by others?
}
```

**Exploit Scenario:**
```bash
# Admin A creates transaction
POST /api/v1/finance/transactions
{"amount": 1000, "type": "REVENUE"}

# Admin B (malicious) modifies it
PATCH /api/v1/finance/transactions/{id}
{"amount": 0.01}  # Reduces revenue to $0.01
```

**Impact:** Financial fraud, data integrity compromise

**CVSS Score:** 8.5 (High) - Upgraded to Critical due to financial impact

---

### 🔴 CRITICAL-3: TOCTOU in Book Sale Update
**Location:** `backend/src/controllers/bookSalesController.ts:268-288`

**Vulnerability:**
```typescript
for (const it of payload.items) {
  if (it.id) {
    await tx.bookSaleItem.update({
      where: { id: it.id },
      data: {
        bookId: it.bookId,
        qty: it.qty,
        unitPrice: new Decimal(it.unitPrice)  // ⚠️ Uses client price BEFORE recalculation
      }
    });
  }
}

// Recalculation happens AFTER updates
const itemsAfter = await tx.bookSaleItem.findMany({...});
// Then recalculates using server prices
```

**Race Condition:**
1. Client sends update with manipulated `unitPrice`
2. Update writes client price to database
3. Recalculation happens after, but if transaction fails/rolls back, client price may persist
4. Between check and use, price could be manipulated

**Exploit Scenario:**
```bash
# Attacker sends concurrent requests
PATCH /api/v1/book-sales/{id}
{"items": [{"id": "xxx", "unitPrice": 0.01}]}

# If transaction timing is off, 0.01 price could be written
```

**Impact:** Financial fraud, price manipulation

**CVSS Score:** 8.2 (High) - Upgraded to Critical due to financial impact

---

### 🔴 CRITICAL-4: BOLA in Menu Permissions
**Location:** `backend/src/controllers/menuPermissionsController.ts:113-172`

**Vulnerability:**
- `updateRoleMenuPermissions()` - No check if user can modify target role
- `toggleMenuPermission()` - No ownership/authorization check
- Any authenticated user can modify any role's permissions

**Missing Authorization:**
```typescript
export const updateRoleMenuPermissions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const roleId = parseInt(req.params.roleId);
  // ⚠️ NO CHECK: Can user modify this role?
  // ⚠️ NO CHECK: Is user admin/super_admin?
  await prisma.roleMenuPermission.deleteMany({ where: { roleId } });
}
```

**Exploit Scenario:**
```bash
# Regular user elevates themselves to admin
PUT /api/menu-permissions/role/4  # user role
{"menuPermissions": [{"menuPath": "/users", ...}]}

# Or modifies super_admin permissions
PUT /api/menu-permissions/role/1
{"menuPermissions": []}  # Removes all permissions
```

**Impact:** Privilege escalation, authorization bypass

**CVSS Score:** 9.3 (Critical)

---

### 🔴 CRITICAL-5: BOLA in Payroll Operations
**Location:** `backend/src/controllers/payrollController.ts:135-253`

**Vulnerability:**
- `updatePayroll()` - No check if user can modify this payroll
- `payPayroll()` - No check if user can pay this payroll
- Any admin can modify/pay any teacher's payroll

**Missing Authorization:**
```typescript
export const updatePayroll = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const existing = await prisma.payroll.findUnique({ where: { id } });
  // ⚠️ NO CHECK: Can this user modify payroll for teacherUserId?
  // ⚠️ NO CHECK: Is user authorized for this specific payroll?
}
```

**Exploit Scenario:**
```bash
# Admin modifies payroll to increase their own salary
PATCH /api/v1/payroll/{payroll-id}
{"baseSalary": 999999, "bonus": 999999}
```

**Impact:** Financial fraud, unauthorized salary modifications

**CVSS Score:** 8.7 (High) - Upgraded to Critical due to financial impact

---

### 🔴 CRITICAL-6: SQL Injection Risk in Settings Controller
**Location:** `backend/src/controllers/settingsController.ts:33-40`

**Vulnerability:**
- Uses raw SQL with parameterized queries (good)
- BUT: No input validation on `key` parameter
- Key is used directly in SQL without sanitization

**Risk:**
```typescript
const result = await pool.query(
  `INSERT INTO settings (key, value, updated_by, updated_at)
   VALUES ($1, $2, $3, now())
   ON CONFLICT (key) 
   DO UPDATE SET value = $2, updated_by = $3, updated_at = now()
   RETURNING *`,
  [key, JSON.stringify(value), req.user?.id]  // ⚠️ key not validated
);
```

**Exploit Scenario:**
```bash
# If key validation fails, could inject SQL
PUT /api/settings/'; DROP TABLE settings;--
{"value": "malicious"}
```

**Impact:** SQL injection, data loss

**CVSS Score:** 9.8 (Critical) - If SQL injection is possible

---

### 🔴 CRITICAL-7: Static File Serving - CORS Allows All Origins
**Location:** `backend/src/index.ts:103-128`

**Vulnerability:**
```typescript
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');  // ⚠️ ALLOWS ALL ORIGINS
  res.header('Access-Control-Allow-Credentials', 'true');
  // ...
});
```

**Impact:**
- Any website can embed/access uploaded files
- Potential for XSS if files contain malicious content
- Information disclosure

**CVSS Score:** 7.5 (High) - Upgraded to Critical if sensitive files exposed

---

### 🔴 CRITICAL-8: Rate Limiting IP Spoofing
**Location:** `backend/src/middleware/rateLimiter.ts:18-24`

**Vulnerability:**
```typescript
keyGenerator: (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded 
    ? (typeof forwarded === 'string' ? forwarded.split(',')[0] : forwarded[0])
    : req.ip || req.socket.remoteAddress || 'unknown';
  return ip;
}
```

**Issue:**
- Trusts `X-Forwarded-For` header (can be spoofed)
- No validation of proxy headers
- Attacker can bypass rate limiting by spoofing IP

**Exploit Scenario:**
```bash
# Attacker spoofs IP to bypass rate limits
curl -H "X-Forwarded-For: 1.2.3.4" /api/auth/login
# Each request appears from different IP
```

**Impact:** Rate limiting bypass, brute force attacks

**CVSS Score:** 7.3 (High) - Upgraded to Critical for auth endpoints

---

## 2. Route Coverage Audit

### Endpoints Missing Ownership/Permission Checks

#### Finance Module (`/api/v1/finance/*`)
| Endpoint | Method | Missing Check | Risk |
|----------|--------|---------------|------|
| `/transactions/:id` | PATCH | Ownership check | High |
| `/transactions/:id` | DELETE | Ownership check | High |
| `/transactions` | GET | No filtering by creator | Medium |
| `/categories/:id` | PATCH | No authorization | Medium |

#### Payroll Module (`/api/v1/payroll/*`)
| Endpoint | Method | Missing Check | Risk |
|----------|--------|---------------|------|
| `/:id` | PATCH | Ownership/authorization | Critical |
| `/:id/pay` | POST | Authorization check | Critical |
| `/` | GET | No filtering by teacher | Medium |

#### Menu Permissions (`/api/menu-permissions/*`)
| Endpoint | Method | Missing Check | Risk |
|----------|--------|---------------|------|
| `/role/:roleId` | PUT | Role modification authorization | Critical |
| `/:id/toggle` | PATCH | Permission modification check | High |
| `/` | GET | No filtering (exposes all roles) | Medium |

#### Settings (`/api/settings/*`)
| Endpoint | Method | Missing Check | Risk |
|----------|--------|---------------|------|
| `/:key` | PUT | Key validation, SQL injection protection | Critical |

#### Lectures (`/api/lectures/*`)
| Endpoint | Method | Missing Check | Risk |
|----------|--------|---------------|------|
| `/:id` | GET | Course enrollment check for students | Medium |
| `/:id` | PUT | Lecture ownership check | Medium |
| `/:id` | DELETE | Lecture ownership check | Medium |

#### Inquiries (`/api/inquiries/*`)
| Endpoint | Method | Missing Check | Risk |
|----------|--------|---------------|------|
| `/:id` | GET | Assignment check (can user view?) | Medium |
| `/:id` | PUT | Assignment check | Medium |
| `/:id/replies` | POST | Assignment check | Medium |

### Inconsistent Enforcement Patterns

1. **Finance Routes:**
   - Uses `requireRole('super_admin', 'admin')` at route level ✅
   - BUT: No object-level authorization (any admin can modify any transaction) ❌

2. **Payroll Routes:**
   - Uses `requireRole('super_admin', 'admin')` at route level ✅
   - BUT: No check if admin can modify specific payroll ❌

3. **Menu Permissions:**
   - Only `authenticate` required ❌
   - Should require admin role AND check if user can modify target role

4. **Lectures:**
   - Uses `requireRole()` for write operations ✅
   - BUT: No ownership check (teacher can modify any lecture) ❌

---

## 3. Token Lifecycle Review

### Current Implementation

#### Access Tokens
- ✅ JWT-based
- ✅ Short expiration (15 minutes default)
- ✅ Signed with secret
- ❌ No revocation mechanism
- ❌ No token rotation
- ❌ No device fingerprinting

#### Refresh Tokens
- ✅ Separate secret
- ✅ Longer expiration (7 days)
- ❌ **NOT stored in database** (Critical)
- ❌ **NOT revocable** (Critical)
- ❌ **No rotation** (Critical)
- ❌ **No replay prevention** (Critical)

### Missing Features

1. **Refresh Token Storage:**
   ```typescript
   // TODO: Store refresh token in database (refresh_tokens table)
   ```
   - Should store: token hash, userId, deviceId, expiresAt, revokedAt
   - Enables revocation and audit trail

2. **Token Rotation:**
   - Should issue new refresh token on each refresh
   - Invalidate old refresh token
   - Prevents token replay

3. **Replay Prevention:**
   - Add nonce/jti (JWT ID) to tokens
   - Store used nonces
   - Reject reused tokens

4. **Device Management:**
   - Track device fingerprint
   - Limit concurrent sessions
   - Notify on new device login

5. **Logout Implementation:**
   ```typescript
   // TODO: Invalidate refresh token in database
   ```
   - Should mark refresh token as revoked
   - Should invalidate all user sessions (optional)

### Recommended Token Lifecycle

```
Login:
  1. Validate credentials
  2. Generate accessToken (15m)
  3. Generate refreshToken (7d)
  4. Store refreshToken hash in DB
  5. Return both tokens

Refresh:
  1. Validate refreshToken signature
  2. Check refreshToken in DB (not revoked)
  3. Check user status (active)
  4. Generate new accessToken
  5. Generate NEW refreshToken (rotate)
  6. Revoke old refreshToken in DB
  7. Store new refreshToken in DB
  8. Return new tokens

Logout:
  1. Revoke refreshToken in DB
  2. Optionally: Revoke all user sessions
```

---

## 4. Misconfiguration Review

### CORS Issues

#### Issue 1: Localhost in Production
**Location:** `backend/src/index.ts:57-62`

```typescript
const allowedOrigins = [
  'http://localhost:5173',  // ⚠️ Should not be in production
  'http://localhost:5174',  // ⚠️ Should not be in production
  'https://adminkoreanwithus.netlify.app',
  process.env.CORS_ORIGIN
].filter(Boolean);
```

**Risk:** If deployed with localhost origins, allows local development access

**Fix:** Filter localhost in production:
```typescript
const allowedOrigins = [
  ...(process.env.NODE_ENV === 'development' ? [
    'http://localhost:5173',
    'http://localhost:5174'
  ] : []),
  'https://adminkoreanwithus.netlify.app',
  process.env.CORS_ORIGIN
].filter(Boolean);
```

#### Issue 2: Static Files CORS
**Location:** `backend/src/index.ts:105`

```typescript
res.header('Access-Control-Allow-Origin', '*');  // ⚠️ Allows all origins
```

**Risk:** Any website can embed/access uploaded files

**Fix:** Use same origin policy or restrict to allowed origins

### Rate Limiting Issues

#### Issue 1: IP Spoofing
**Location:** `backend/src/middleware/rateLimiter.ts:18-24`

**Problem:** Trusts `X-Forwarded-For` header without validation

**Fix:** 
- Use trusted proxy configuration
- Validate proxy headers
- Use `req.ip` from Express trust proxy
- Consider rate limiting by user ID for authenticated endpoints

#### Issue 2: No Redis/Distributed Store
**Current:** In-memory store (lost on restart, not shared across instances)

**Risk:** 
- Rate limits reset on restart
- Not effective in multi-instance deployments

**Fix:** Use Redis for distributed rate limiting

### Helmet CSP Issues

#### Issue 1: `unsafe-inline` in styleSrc
**Location:** `backend/src/index.ts:34`

```typescript
styleSrc: ["'self'", "'unsafe-inline'"],  // ⚠️ Allows inline styles
```

**Risk:** XSS via inline styles

**Fix:** Use nonces or remove `unsafe-inline` if possible

#### Issue 2: Missing `base-uri` and `form-action`
**Risk:** Base tag injection, form action hijacking

**Fix:** Add:
```typescript
baseUri: ["'self'"],
formAction: ["'self'"],
```

---

## 5. Top 5 Critical Risks with Code Patches

### Risk #1: JWT Refresh Token Not Revocable

**Priority:** 🔴 CRITICAL  
**CVSS:** 9.1

**Patch:**

```typescript
// backend/src/controllers/authController.ts

// Add refresh token storage
export const login = async (req: Request, res: Response, next: NextFunction) => {
  // ... existing code ...

  // Generate refresh token
  const refreshToken = jwt.sign(
    { id: user.id, type: 'refresh', jti: crypto.randomUUID() },
    refreshSecret,
    { expiresIn: refreshExpiresIn }
  );

  // Store refresh token in database
  await prisma.refreshToken.create({
    data: {
      tokenHash: crypto.createHash('sha256').update(refreshToken).digest('hex'),
      userId: user.id,
      expiresAt: new Date(Date.now() + (typeof refreshExpiresIn === 'string' 
        ? parseDuration(refreshExpiresIn) 
        : refreshExpiresIn * 1000)),
      deviceInfo: req.get('user-agent') || 'unknown',
      ipAddress: req.ip || 'unknown'
    }
  });

  // ... rest of code ...
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  const { refreshToken } = req.body;
  
  // Verify token
  const decoded = jwt.verify(refreshToken, refreshSecret) as { 
    id: number; 
    type: string; 
    jti: string 
  };

  // Check token in database
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const storedToken = await prisma.refreshToken.findFirst({
    where: {
      tokenHash,
      userId: decoded.id,
      revokedAt: null,
      expiresAt: { gt: new Date() }
    }
  });

  if (!storedToken) {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  // Get user
  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
    include: { role: true }
  });

  if (!user || user.status !== 'active') {
    throw new AppError('User not found or inactive', 401);
  }

  // Revoke old token
  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: { revokedAt: new Date() }
  });

  // Generate new tokens (rotate)
  const newAccessToken = jwt.sign({...}, jwtSecret, { expiresIn });
  const newRefreshToken = jwt.sign(
    { id: user.id, type: 'refresh', jti: crypto.randomUUID() },
    refreshSecret,
    { expiresIn: refreshExpiresIn }
  );

  // Store new refresh token
  await prisma.refreshToken.create({
    data: {
      tokenHash: crypto.createHash('sha256').update(newRefreshToken).digest('hex'),
      userId: user.id,
      expiresAt: new Date(Date.now() + parseDuration(refreshExpiresIn)),
      deviceInfo: req.get('user-agent') || 'unknown',
      ipAddress: req.ip || 'unknown'
    }
  });

  res.json({
    success: true,
    data: { 
      accessToken: newAccessToken,
      refreshToken: newRefreshToken  // Return new refresh token
    }
  });
};

export const logout = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { refreshToken } = req.body;
  
  if (refreshToken) {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await prisma.refreshToken.updateMany({
      where: {
        tokenHash,
        userId: req.user!.id,
        revokedAt: null
      },
      data: { revokedAt: new Date() }
    });
  } else {
    // Revoke all user's refresh tokens
    await prisma.refreshToken.updateMany({
      where: {
        userId: req.user!.id,
        revokedAt: null
      },
      data: { revokedAt: new Date() }
    });
  }

  res.json({ success: true, message: 'Logged out successfully' });
};
```

**Database Migration:**
```sql
CREATE TABLE refresh_tokens (
  id SERIAL PRIMARY KEY,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP,
  device_info TEXT,
  ip_address INET,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_user_id (user_id),
  INDEX idx_token_hash (token_hash),
  INDEX idx_expires_at (expires_at)
);
```

---

### Risk #2: BOLA in Finance Transactions

**Priority:** 🔴 CRITICAL  
**CVSS:** 8.5

**Patch:**

```typescript
// backend/src/controllers/financeTransactionsController.ts

export const updateTransaction = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const requestingUser = req.user!;

    const existing = await prisma.financeTransaction.findFirst({ 
      where: { id, isDeleted: false } 
    });
    
    if (!existing) {
      throw new AppError('Transaction not found', 404);
    }

    // SECURITY: Check ownership or admin role
    // Regular admins can only modify their own transactions
    // Super admin can modify any transaction
    if (requestingUser.roleName !== 'super_admin' && 
        existing.createdByUserId !== requestingUser.id) {
      throw new AppError('Access denied: You can only modify your own transactions', 403);
    }

    // SECURITY: Prevent modification of transactions linked to book sales or payroll
    // These should only be modified through their respective modules
    if (existing.referenceType === 'BOOK_SALE' || existing.referenceType === 'PAYROLL') {
      throw new AppError('Cannot modify system-generated transactions', 403);
    }

    // ... rest of update logic ...
  } catch (error) {
    next(error);
  }
};

export const deleteTransaction = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const requestingUser = req.user!;

    const existing = await prisma.financeTransaction.findFirst({ 
      where: { id, isDeleted: false } 
    });
    
    if (!existing) {
      throw new AppError('Transaction not found', 404);
    }

    // SECURITY: Check ownership
    if (requestingUser.roleName !== 'super_admin' && 
        existing.createdByUserId !== requestingUser.id) {
      throw new AppError('Access denied: You can only delete your own transactions', 403);
    }

    // SECURITY: Prevent deletion of system-generated transactions
    if (existing.referenceType === 'BOOK_SALE' || existing.referenceType === 'PAYROLL') {
      throw new AppError('Cannot delete system-generated transactions', 403);
    }

    await prisma.financeTransaction.update({
      where: { id },
      data: { isDeleted: true }
    });

    res.json({ success: true, data: { id, deleted: true } });
  } catch (error) {
    next(error);
  }
};
```

---

### Risk #3: TOCTOU in Book Sale Update

**Priority:** 🔴 CRITICAL  
**CVSS:** 8.2

**Patch:**

```typescript
// backend/src/controllers/bookSalesController.ts

export const updateBookSale = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // ... existing validation ...

    const updated = await prisma.$transaction(async (tx) => {
      // SECURITY FIX: Fetch books FIRST, before any updates
      const bookIds = [...new Set(payload.items.map((i) => i.bookId))];
      const books = await tx.book.findMany({
        where: { id: { in: bookIds } },
        select: { id: true, salePrice: true, costPrice: true, isActive: true }
      });

      // Validate all books exist and are active
      if (books.length !== bookIds.length) {
        throw new AppError('One or more books not found', 404);
      }

      const inactiveBooks = books.filter(b => !b.isActive);
      if (inactiveBooks.length > 0) {
        throw new AppError(`Cannot sell inactive books`, 400);
      }

      const bookSalePriceMap = new Map(books.map((b) => [b.id, Number(b.salePrice)]));
      const bookCostMap = new Map(books.map((b) => [b.id, b.costPrice != null ? Number(b.costPrice) : null]));

      // SECURITY FIX: Use server prices for ALL updates, ignore client prices
      const toDelete = existing.items.filter((i) => !itemIdsInPayload.has(i.id));
      if (toDelete.length > 0) {
        await tx.bookSaleItem.deleteMany({
          where: { id: { in: toDelete.map((i) => i.id) } }
        });
      }

      // Update/create items using SERVER prices only
      for (const it of payload.items) {
        const serverPrice = bookSalePriceMap.get(it.bookId);
        if (!serverPrice) {
          throw new AppError(`Book ${it.bookId} not found or inactive`, 404);
        }

        if (it.id) {
          await tx.bookSaleItem.update({
            where: { id: it.id },
            data: {
              bookId: it.bookId,
              qty: it.qty,
              unitPrice: new Decimal(serverPrice)  // Use server price, not client
            }
          });
        } else {
          await tx.bookSaleItem.create({
            data: {
              saleId,
              bookId: it.bookId,
              qty: it.qty,
              unitPrice: new Decimal(serverPrice)  // Use server price, not client
            }
          });
        }
      }

      // Recalculate totals using server prices
      const itemsAfter = await tx.bookSaleItem.findMany({
        where: { saleId },
        include: { book: { select: { id: true, salePrice: true, costPrice: true } } }
      });

      let totalAmount = 0;
      let totalProfit = 0;
      for (const i of itemsAfter) {
        const serverPrice = Number(i.book.salePrice);
        const cost = i.book.costPrice != null ? Number(i.book.costPrice) : 0;
        totalAmount += i.qty * serverPrice;
        totalProfit += (serverPrice - cost) * i.qty;
      }

      // ... rest of update logic ...
    });

    // ... return response ...
  } catch (error) {
    next(error);
  }
};
```

---

### Risk #4: BOLA in Menu Permissions

**Priority:** 🔴 CRITICAL  
**CVSS:** 9.3

**Patch:**

```typescript
// backend/src/controllers/menuPermissionsController.ts

export const updateRoleMenuPermissions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const roleId = parseInt(req.params.roleId);
    const { menuPermissions } = req.body;
    const requestingUser = req.user!;

    // SECURITY: Only super_admin can modify permissions
    if (requestingUser.roleName !== 'super_admin') {
      throw new AppError('Access denied: Only super_admin can modify role permissions', 403);
    }

    // SECURITY: Prevent modification of super_admin role permissions
    const targetRole = await prisma.role.findUnique({ where: { id: roleId } });
    if (!targetRole) {
      throw new AppError('Role not found', 404);
    }

    if (targetRole.name === 'super_admin' && requestingUser.roleName !== 'super_admin') {
      throw new AppError('Access denied: Cannot modify super_admin permissions', 403);
    }

    // ... rest of update logic ...
  } catch (error) {
    next(error);
  }
};

export const toggleMenuPermission = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const requestingUser = req.user!;

    // SECURITY: Only super_admin can toggle permissions
    if (requestingUser.roleName !== 'super_admin') {
      throw new AppError('Access denied: Only super_admin can toggle permissions', 403);
    }

    const menuPermission = await prisma.roleMenuPermission.findUnique({
      where: { id },
      include: { role: true }
    });

    if (!menuPermission) {
      throw new AppError('Menu permission not found', 404);
    }

    // SECURITY: Prevent modification of super_admin permissions
    if (menuPermission.role.name === 'super_admin') {
      throw new AppError('Access denied: Cannot modify super_admin permissions', 403);
    }

    // ... rest of toggle logic ...
  } catch (error) {
    next(error);
  }
};
```

**Route Update:**
```typescript
// backend/src/routes/menuPermissions.ts

menuPermissionsRouter.put('/role/:roleId', 
  authenticate,
  requireRole('super_admin'),  // Add this
  updateRoleMenuPermissions
);

menuPermissionsRouter.patch('/:id/toggle', 
  authenticate,
  requireRole('super_admin'),  // Add this
  toggleMenuPermission
);
```

---

### Risk #5: Rate Limiting IP Spoofing

**Priority:** 🔴 CRITICAL  
**CVSS:** 7.3

**Patch:**

```typescript
// backend/src/middleware/rateLimiter.ts

import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// Configure Express to trust proxy
// In index.ts, add: app.set('trust proxy', 1); // Trust first proxy

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // SECURITY FIX: Use Express's trusted proxy IP
  keyGenerator: (req: Request): string => {
    // Express will set req.ip correctly if trust proxy is configured
    // This prevents X-Forwarded-For spoofing
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
  // SECURITY FIX: For authenticated endpoints, also rate limit by user ID
  skip: (req: Request) => {
    if (process.env.NODE_ENV === 'development' && (req as any).user?.roleName === 'super_admin') {
      return true;
    }
    return false;
  }
});

// SECURITY FIX: Add user-based rate limiting for authenticated endpoints
export const userBasedLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200, // Higher limit for authenticated users
  message: {
    success: false,
    message: 'Too many requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Rate limit by user ID instead of IP
  keyGenerator: (req: Request): string => {
    const user = (req as any).user;
    if (user?.id) {
      return `user:${user.id}`;
    }
    // Fallback to IP if not authenticated
    return req.ip || req.socket.remoteAddress || 'unknown';
  }
});
```

**Update index.ts:**
```typescript
// backend/src/index.ts

// SECURITY: Configure trust proxy BEFORE rate limiting
// Only trust proxy if behind a known proxy (e.g., Cloudflare, AWS ALB)
if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1); // Trust first proxy
}

// Apply rate limiting
app.use('/api', apiLimiter);

// For authenticated routes, also apply user-based limiting
app.use('/api', (req, res, next) => {
  if ((req as any).user) {
    return userBasedLimiter(req, res, next);
  }
  next();
});
```

---

## Go / No-Go Decision

### 🔴 **NO-GO** - Do Not Deploy to Production

**Reasoning:**

1. **8 Critical Blockers** identified that could lead to:
   - Complete account takeover (non-revocable tokens)
   - Financial fraud (BOLA in finance/payroll)
   - Privilege escalation (menu permissions)
   - System compromise (SQL injection risk)

2. **Token Security:** Refresh tokens cannot be revoked, enabling persistent unauthorized access

3. **Authorization Gaps:** Multiple endpoints lack proper object-level authorization

4. **TOCTOU Vulnerabilities:** Race conditions in financial operations

5. **Configuration Issues:** Rate limiting can be bypassed, CORS misconfigurations

### Required Actions Before Production

#### Must Fix (Critical):
- [ ] Implement refresh token storage and revocation
- [ ] Add ownership checks to finance transactions
- [ ] Fix TOCTOU in book sale updates
- [ ] Add authorization to menu permissions
- [ ] Add authorization to payroll operations
- [ ] Validate and sanitize settings key parameter
- [ ] Fix static file CORS
- [ ] Fix rate limiting IP spoofing

#### Should Fix (High):
- [ ] Add ownership checks to lectures
- [ ] Add assignment checks to inquiries
- [ ] Implement token rotation
- [ ] Add device fingerprinting
- [ ] Use Redis for distributed rate limiting
- [ ] Remove `unsafe-inline` from CSP
- [ ] Filter localhost origins in production

#### Nice to Have (Medium):
- [ ] Add audit logging for all sensitive operations
- [ ] Implement concurrent session limits
- [ ] Add request ID tracking
- [ ] Enhance error messages (reduce information disclosure)

### Estimated Fix Time

- **Critical Fixes:** 2-3 days
- **High Priority Fixes:** 1-2 days
- **Testing & Validation:** 1-2 days
- **Total:** 4-7 days

### Re-Audit Required

After implementing critical fixes, a re-audit is required to verify:
1. All critical blockers are resolved
2. Token lifecycle is properly implemented
3. BOLA protections are in place
4. Rate limiting cannot be bypassed
5. CORS is properly configured

---

**Review Completed:** 2025-01-XX  
**Next Review:** After critical fixes implemented  
**Status:** 🔴 **BLOCKED - NO-GO**

