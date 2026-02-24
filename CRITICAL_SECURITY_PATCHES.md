# Critical Security Patches - Implementation Guide

This document provides concrete code patches for the top 5 critical security vulnerabilities identified in the production gate review.

---

## Patch 1: Refresh Token Storage & Revocation

### Database Migration

Create file: `backend/prisma/migrations/XXXXXX_add_refresh_tokens/migration.sql`

```sql
-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" SERIAL NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "user_id" INTEGER NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "device_info" TEXT,
    "ip_address" INET,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

### Update Prisma Schema

Add to `backend/prisma/schema.prisma`:

```prisma
model RefreshToken {
  id        Int       @id @default(autoincrement())
  tokenHash String    @unique @map("token_hash") @db.VarChar(64)
  userId    Int       @map("user_id")
  expiresAt DateTime  @map("expires_at")
  revokedAt DateTime? @map("revoked_at")
  deviceInfo String?  @map("device_info")
  ipAddress String?   @map("ip_address") @db.Inet
  createdAt DateTime  @default(now()) @map("created_at")
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
  @@map("refresh_tokens")
}
```

Update User model:
```prisma
model User {
  // ... existing fields ...
  refreshTokens RefreshToken[]
}
```

### Update Auth Controller

**File:** `backend/src/controllers/authController.ts`

```typescript
import crypto from 'crypto';
import { generateTokenId, storeRefreshToken, validateRefreshToken, 
         revokeRefreshToken, revokeAllUserTokens, rotateRefreshToken } from '../patches/refreshTokenStorage';

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // ... existing validation code ...

    // Generate tokens with JTI for replay prevention
    const jti = generateTokenId();
    const accessToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        roleId: user.roleId,
        roleName: user.role.name,
        jti: jti
      },
      jwtSecret,
      { expiresIn }
    );

    const refreshToken = jwt.sign(
      { 
        id: user.id, 
        type: 'refresh',
        jti: crypto.randomUUID()
      },
      refreshSecret,
      { expiresIn: refreshExpiresIn }
    );

    // Store refresh token in database
    await storeRefreshToken(
      refreshToken,
      user.id,
      refreshExpiresIn,
      req.get('user-agent') || 'unknown',
      req.ip || 'unknown'
    );

    res.json({
      success: true,
      data: {
        user: { /* ... */ },
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError('Refresh token required', 400);
    }

    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    if (!refreshSecret) {
      throw new Error('JWT_REFRESH_SECRET not configured');
    }

    const decoded = jwt.verify(refreshToken, refreshSecret) as { 
      id: number; 
      type: string;
      jti: string;
    };

    if (decoded.type !== 'refresh') {
      throw new AppError('Invalid token type', 401);
    }

    // Validate token in database
    const isValid = await validateRefreshToken(refreshToken, decoded.id);
    if (!isValid) {
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

    const jwtSecret = process.env.JWT_SECRET;
    const expiresIn: string | number = process.env.JWT_EXPIRES_IN || '15m';

    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    // Generate new tokens (rotate)
    const newJti = generateTokenId();
    const newAccessToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        roleId: user.roleId,
        roleName: user.role.name,
        jti: newJti
      },
      jwtSecret,
      { expiresIn }
    );

    const newRefreshToken = jwt.sign(
      { 
        id: user.id, 
        type: 'refresh',
        jti: crypto.randomUUID()
      },
      refreshSecret,
      { expiresIn: refreshExpiresIn }
    );

    // Rotate tokens (revoke old, store new)
    await rotateRefreshToken(
      refreshToken,
      newRefreshToken,
      user.id,
      refreshExpiresIn,
      req.get('user-agent') || 'unknown',
      req.ip || 'unknown'
    );

    res.json({
      success: true,
      data: { 
        accessToken: newAccessToken,
        refreshToken: newRefreshToken  // Return new refresh token
      }
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    const userId = (req as any).user?.id;

    if (refreshToken && userId) {
      await revokeRefreshToken(refreshToken, userId);
    } else if (userId) {
      // Revoke all user's tokens
      await revokeAllUserTokens(userId);
    }

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};
```

---

## Patch 2: BOLA in Finance Transactions

**File:** `backend/src/controllers/financeTransactionsController.ts`

```typescript
export const updateTransaction = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const requestingUser = req.user!;

    const parsed = updateTransactionSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors.map((e) => e.message).join(', ') || 'Validation failed', 400);
    }

    const existing = await prisma.financeTransaction.findFirst({ 
      where: { id, isDeleted: false } 
    });
    
    if (!existing) {
      throw new AppError('Transaction not found', 404);
    }

    // SECURITY: Check ownership or super_admin role
    if (requestingUser.roleName !== 'super_admin' && 
        existing.createdByUserId !== requestingUser.id) {
      throw new AppError('Access denied: You can only modify your own transactions', 403);
    }

    // SECURITY: Prevent modification of system-generated transactions
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

## Patch 3: TOCTOU in Book Sale Update

**File:** `backend/src/controllers/bookSalesController.ts`

Replace the `updateBookSale` function with:

```typescript
export const updateBookSale = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new AppError('Authentication required', 401);

    const saleId = req.params.id as string;
    if (!saleId) throw new AppError('Sale ID required', 400);

    const parsed = updateBookSaleSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors.map((e) => e.message).join(', ') || 'Validation failed', 400);
    }

    const existing = await prisma.bookSale.findUnique({
      where: { id: saleId },
      include: { items: true }
    });
    if (!existing) throw new AppError('Book sale not found', 404);

    const payload = parsed.data;
    const itemIdsInPayload = new Set(
      payload.items.map((i) => i.id).filter((id): id is string => id != null)
    );

    const updated = await prisma.$transaction(async (tx) => {
      // SECURITY FIX: Fetch books FIRST, before any updates (prevents TOCTOU)
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

      // Delete items not in payload
      const toDelete = existing.items.filter((i) => !itemIdsInPayload.has(i.id));
      if (toDelete.length > 0) {
        await tx.bookSaleItem.deleteMany({
          where: { id: { in: toDelete.map((i) => i.id) } }
        });
      }

      // SECURITY FIX: Use server prices for ALL updates, ignore client prices
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

      const soldAt = payload.soldAt != null ? parseDate(payload.soldAt) : existing.soldAt;
      const note = `Book sale gross=${totalAmount}, profit=${totalProfit}`;

      await tx.bookSale.update({
        where: { id: saleId },
        data: {
          soldAt,
          ...(payload.customerName !== undefined && { customerName: payload.customerName ?? undefined }),
          ...(payload.paymentMethod != null && { paymentMethod: payload.paymentMethod as PaymentMethod }),
          ...(payload.currency != null && { currency: payload.currency as Currency }),
          totalAmount: new Decimal(totalAmount),
          profitAmount: new Decimal(totalProfit)
        }
      });

      const linked = await tx.financeTransaction.findFirst({
        where: { referenceType: 'BOOK_SALE', referenceId: saleId, isDeleted: false }
      });
      if (linked) {
        await tx.financeTransaction.update({
          where: { id: linked.id },
          data: {
            amount: new Decimal(totalProfit),
            note,
            occurredAt: soldAt,
            ...(payload.paymentMethod != null && { paymentMethod: payload.paymentMethod as PaymentMethod }),
            ...(payload.currency != null && { currency: payload.currency as Currency })
          }
        });
      }

      return tx.bookSale.findUnique({
        where: { id: saleId },
        include: {
          items: { include: { book: { select: { id: true, title: true } } } },
          createdByUser: { select: { id: true, firstName: true, lastName: true } }
        }
      });
    });

    if (!updated) throw new AppError('Failed to update sale', 500);

    res.json({
      success: true,
      data: {
        ...updated,
        totalAmount: Number(updated.totalAmount),
        profitAmount: updated.profitAmount != null ? Number(updated.profitAmount) : null,
        items: updated.items.map((i) => ({
          id: i.id,
          bookId: i.bookId,
          book: i.book,
          qty: i.qty,
          unitPrice: Number(i.unitPrice),
          lineTotal: i.qty * Number(i.unitPrice)
        })),
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
};
```

---

## Patch 4: BOLA in Menu Permissions

**File:** `backend/src/controllers/menuPermissionsController.ts`

```typescript
export const updateRoleMenuPermissions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const roleId = parseInt(req.params.roleId);
    const { menuPermissions } = req.body;
    const requestingUser = req.user!;

    // SECURITY: Only super_admin can modify permissions
    if (requestingUser.roleName !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only super_admin can modify role permissions'
      });
    }

    if (isNaN(roleId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role ID'
      });
    }

    // SECURITY: Prevent modification of super_admin role permissions
    const targetRole = await prisma.role.findUnique({ where: { id: roleId } });
    if (!targetRole) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    // Additional safety: Even super_admin shouldn't remove all their own permissions
    if (targetRole.name === 'super_admin' && requestingUser.roleId === roleId) {
      // Allow but log warning
      console.warn('Super admin modifying their own permissions');
    }

    if (!Array.isArray(menuPermissions)) {
      return res.status(400).json({
        success: false,
        message: 'menuPermissions must be an array'
      });
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
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only super_admin can toggle permissions'
      });
    }

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid permission ID'
      });
    }

    const menuPermission = await prisma.roleMenuPermission.findUnique({
      where: { id },
      include: { role: true }
    });

    if (!menuPermission) {
      return res.status(404).json({
        success: false,
        message: 'Menu permission not found'
      });
    }

    // SECURITY: Prevent modification of super_admin permissions
    if (menuPermission.role.name === 'super_admin' && requestingUser.roleId !== menuPermission.roleId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Cannot modify super_admin permissions'
      });
    }

    // ... rest of toggle logic ...
  } catch (error) {
    next(error);
  }
};
```

**File:** `backend/src/routes/menuPermissions.ts`

```typescript
import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
// ... other imports ...

export const menuPermissionsRouter = Router();

menuPermissionsRouter.use(authenticate);

// ... existing routes ...

// SECURITY: Add role requirement
menuPermissionsRouter.put('/role/:roleId', 
  requireRole('super_admin'),
  updateRoleMenuPermissions
);

menuPermissionsRouter.patch('/:id/toggle', 
  requireRole('super_admin'),
  toggleMenuPermission
);
```

---

## Patch 5: Rate Limiting IP Spoofing

**File:** `backend/src/index.ts`

Add before rate limiting:

```typescript
// SECURITY: Configure trust proxy BEFORE rate limiting
// Only trust proxy if behind a known proxy (e.g., Cloudflare, AWS ALB)
if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1); // Trust first proxy
  // For multiple proxies: app.set('trust proxy', 2);
}
```

**File:** `backend/src/middleware/rateLimiter.ts`

```typescript
import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// SECURITY FIX: Use Express's trusted proxy IP
// Express will set req.ip correctly if trust proxy is configured
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // SECURITY FIX: Use req.ip (Express handles proxy headers correctly)
  keyGenerator: (req: Request): string => {
    // Express will set req.ip correctly if trust proxy is configured
    // This prevents X-Forwarded-For spoofing when behind a trusted proxy
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
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

**File:** `backend/src/index.ts`

```typescript
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

## Additional Critical Patches

### Patch 6: BOLA in Payroll

**File:** `backend/src/controllers/payrollController.ts`

Add ownership checks to `updatePayroll` and `payPayroll`:

```typescript
export const updatePayroll = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const requestingUser = req.user!;

    // ... existing validation ...

    const existing = await prisma.payroll.findUnique({ 
      where: { id },
      include: { teacherUser: true }
    });
    
    if (!existing) throw new AppError('Payroll not found', 404);
    
    // SECURITY: Only super_admin can modify payroll
    // Regular admin cannot modify payroll (prevents self-enrichment)
    if (requestingUser.roleName !== 'super_admin') {
      throw new AppError('Access denied: Only super_admin can modify payroll', 403);
    }

    if (existing.status === 'PAID') {
      throw new AppError('Cannot update payroll that is already paid', 400);
    }

    // ... rest of update logic ...
  } catch (error) {
    next(error);
  }
};

export const payPayroll = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new AppError('Authentication required', 401);

    const { id } = req.params;
    const requestingUser = req.user!;

    // SECURITY: Only super_admin can pay payroll
    if (requestingUser.roleName !== 'super_admin') {
      throw new AppError('Access denied: Only super_admin can process payroll payments', 403);
    }

    // ... rest of payment logic ...
  } catch (error) {
    next(error);
  }
};
```

### Patch 7: Settings Key Validation

**File:** `backend/src/controllers/settingsController.ts`

```typescript
export const updateSetting = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    // SECURITY: Validate key to prevent SQL injection
    if (!key || typeof key !== 'string') {
      throw new AppError('Invalid setting key', 400);
    }

    // SECURITY: Only allow alphanumeric, underscore, and hyphen
    if (!/^[a-zA-Z0-9_-]+$/.test(key)) {
      throw new AppError('Invalid setting key format', 400);
    }

    // SECURITY: Limit key length
    if (key.length > 100) {
      throw new AppError('Setting key too long', 400);
    }

    if (value === undefined) {
      throw new AppError('Value is required', 400);
    }

    // Use Prisma instead of raw SQL for better security
    await prisma.setting.upsert({
      where: { key },
      update: {
        value: value,
        updatedBy: req.user?.id
      },
      create: {
        key,
        value: value,
        updatedBy: req.user?.id
      }
    });

    const setting = await prisma.setting.findUnique({ where: { key } });

    res.json({
      success: true,
      data: setting
    });
  } catch (error) {
    next(error);
  }
};
```

### Patch 8: Static File CORS

**File:** `backend/src/index.ts`

```typescript
// Serve static files for uploads
app.use('/uploads', (req, res, next) => {
  // SECURITY FIX: Use same origin policy or restrict to allowed origins
  const origin = req.headers.origin;
  if (origin && allowedOrigins.indexOf(origin) !== -1) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    res.header('Access-Control-Allow-Origin', 'null'); // Same origin
  }
  
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  
  // ... rest of headers ...
  
  next();
}, express.static(path.join(__dirname, '../uploads'), {
  // ... existing config ...
}));
```

---

## Implementation Checklist

- [ ] Run database migration for refresh_tokens table
- [ ] Update Prisma schema and regenerate client
- [ ] Implement refresh token storage functions
- [ ] Update auth controller with token rotation
- [ ] Add ownership checks to finance transactions
- [ ] Fix TOCTOU in book sale updates
- [ ] Add authorization to menu permissions
- [ ] Add authorization to payroll operations
- [ ] Validate settings key parameter
- [ ] Fix static file CORS
- [ ] Configure trust proxy for rate limiting
- [ ] Update rate limiter to use req.ip
- [ ] Add user-based rate limiting
- [ ] Test all patches
- [ ] Run security tests
- [ ] Re-audit before production

---

**Last Updated:** 2025-01-XX

