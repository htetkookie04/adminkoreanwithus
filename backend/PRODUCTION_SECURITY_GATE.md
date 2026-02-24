# Production Security Gate — Final Review

**Reviewer:** Senior AppSec Engineer  
**Context:** Post–IDOR/CORS/rate-limit fixes; attacker assumed to use Burp Suite, ID fuzzing, payload tampering, token replay, business-logic abuse.

---

## 1) Critical Blocker Check

### 1.1 BOLA / Broken Object Level Authorization Gaps

| Finding | Location | Risk |
|--------|----------|------|
| **Menu permissions — no admin check** | `routes/menuPermissions.ts`: all routes use only `authenticate`. Any logged-in user can `GET /menu-permissions/role/:roleId`, `PUT /menu-permissions/role/:roleId`, `PATCH /menu-permissions/:id/toggle`, and `GET /menu-permissions`. | **Critical** — Attacker can read/modify any role’s menu permissions (privilege escalation / UI abuse). |
| **Roles list — no permission** | `routes/roles.ts`: `GET /api/roles` only `authenticate`. Any user can enumerate roles. | **Medium** — Info disclosure; supports role-id fuzzing. |
| **Inquiry by ID** | `inquiriesController.getInquiry`: any user with `inquiries.view` can read any inquiry by ID (no per-inquiry ownership). | **Low** — Acceptable if “view” is intended as global for support; document. |
| **Settings key from params** | `settingsController.updateSetting`: `key` from `req.params` with no allowlist. Attacker can try to overwrite arbitrary config keys. | **High** — Arbitrary key overwrite if keys control security (e.g. feature flags, URLs). |

**Already fixed:** Users (ownership + privilege escalation), Enrollments (ownership + payment-status), Lectures (enrollment/teacher check for getLecture).

---

### 1.2 JWT / Session Weaknesses

| Finding | Detail | Risk |
|--------|--------|------|
| **No token revocation** | Logout is a no-op; refresh tokens not stored. Stolen access/refresh tokens valid until expiry. | **High** — Token replay until 15m / 7d. |
| **No refresh rotation** | New access token issued from refresh without issuing a new refresh token; no binding. | **Medium** — Refresh token reuse not detected. |
| **No replay prevention** | No jti/nonce or server-side one-time use; same token can be replayed. | **High** — Replay in same window. |
| **Expiration strategy** | Access 15m (good); refresh 7d (long if not revocable). | **Medium** — Acceptable only with revocation. |
| **JWT payload trusted** | `roleId`/`roleName` from token; if DB role changes, token still has old role until expiry. | **Low** — Mitigated by short access expiry; document. |

---

### 1.3 TOCTOU Risks

| Area | Detail | Risk |
|------|--------|------|
| **approveEnrollment** | Reads enrollment by id then updates status in one step (no explicit read-then-write race). Prisma update is atomic. | **Low** |
| **updateEnrollment** | Fetches enrollment then builds `updateData` and updates; small window for status change by another request. | **Low** — Acceptable for enrollment workflow. |
| **Finance / payroll** | No double-pay check shown in reviewed code; ensure payroll “pay” and finance flows use transactional checks. | **Low** — Verify in code paths. |

---

### 1.4 Missing Validation

| Location | Issue | Risk |
|----------|--------|------|
| **createInquiry** | Public endpoint; only checks `name`, `email`, `message`. No length/sanitization, no rate limit on route. | **High** — DoS, injection, spam. |
| **updateSetting** | `value` from body not validated per key (type/length). | **Medium** |
| **menuPermissionsController** | `updateRoleMenuPermissions`: `menuPermissions` array and items not validated (menuKey, menuPath, sortOrder). | **Medium** — Tampering, path injection. |
| **Params (id, roleId)** | Several controllers use `parseInt(id)` without schema validation; NaN/negative handled inconsistently. | **Low** — ID fuzzing can cause 400/404; ensure no info leak. |

---

### 1.5 Secrets Exposure

| Check | Status |
|-------|--------|
| JWT_SECRET / JWT_REFRESH_SECRET | From env; not logged. OK. |
| DATABASE_URL | From env; errorHandler in dev can mention “DATABASE_URL” in message. | **Low** — Ensure production never returns DB hints. |
| Stack traces / Prisma errors | Only in `NODE_ENV !== 'production'`. OK if NODE_ENV is set. |
| Docs (SETUP_AND_TEST.md, etc.) | Example secrets; ensure not deployed. | **Low** |

---

### 1.6 Privilege Escalation Paths

| Path | Mitigation | Status |
|------|-------------|--------|
| Change own role via PUT /users/:id | Blocked (only admin can set role). | OK |
| Grant self menu/permissions | Menu-permissions routes have no role check — any user can change any role’s menus. | **Critical** — Must restrict to admin. |
| Mark enrollment paid | Only admin can set paymentStatus. | OK |
| Finance / payroll / book-sales | requireRole('super_admin','admin'). | OK |

---

## 2) Route Coverage Audit

### 2.1 Endpoints Missing Ownership or Permission Checks

| Method | Path | Auth | Role/Permission | Note |
|--------|------|------|------------------|------|
| GET/PUT/PATCH | /api/menu-permissions/* | ✓ | **None** | Any user can read/update any role’s menu. **Critical.** |
| GET | /api/roles | ✓ | **None** | Any user can list roles. **Medium.** |
| GET | /api/timetable/public | No | — | Public; OK. |
| GET | /api/gallery/public | No | — | Public; OK. |
| POST | /api/inquiries | No | — | Public contact; **needs rate limit + validation.** |
| GET/PATCH | /api/settings, /api/settings/:key | ✓ | requirePermission('settings','manage') | updateSetting has no key allowlist. **High.** |

### 2.2 Inconsistent Enforcement

- **Lectures:** `requireRole('admin','super_admin','teacher')` (and teacher ownership in getLecture) — not `requirePermission`.
- **Users, enrollments, courses, reports, analytics, inquiries (protected):** `requirePermission(resource, action)`.
- **Finance, book-sales, payroll, books (v1):** `requireRole('super_admin','admin')` only.
- **Menu-permissions:** authenticate only.

**Recommendation:** Treat “who can manage roles/menus” as admin-only: add `requireRole('super_admin','admin')` (or equivalent permission) to menu-permissions and consider permission for GET /roles.

---

## 3) Token Lifecycle Review

| Control | Implemented | Notes |
|---------|-------------|--------|
| **Refresh rotation** | No | Same refresh token reused; no new refresh on use. |
| **Token revocation** | No | Logout and refresh not stored; no invalidation. |
| **Replay prevention** | No | No jti, no one-time use, no binding to request. |
| **Expiration** | Yes | Access 15m, refresh 7d (env). |
| **Binding (e.g. IP/UA)** | No | Token not bound to client. |

**Recommendation (pre-prod):** At minimum: (1) Store refresh tokens (e.g. in DB) and invalidate on logout and on refresh use (one-time use). (2) Optionally rotate refresh token on each refresh. (3) Consider short-lived refresh (e.g. 1d) until revocation is in place.

---

## 4) Misconfiguration Review

### 4.1 CORS Bypass Possibilities

- **Auth OPTIONS handlers** (`routes/auth.ts`):  
  `res.header('Access-Control-Allow-Origin', req.headers.origin || '*')`  
  Reflects any `Origin` (including evil.com). **Critical** — removes CORS protection for preflight on login/refresh.

- **Main CORS** (`index.ts`): Only allows `allowedOrigins`; rejects others. OK.

- **Uploads** (`index.ts`): `Access-Control-Allow-Origin: '*'` for `/uploads`. If frontend sends credentials to same host, browser may treat uploads as cross-origin; typically uploads are same-origin or CORS is relaxed by design. **Low** — Document; avoid sending credentials to /uploads if possible.

### 4.2 Proxy / IP Trust (Rate Limiting)

- **rateLimiter.ts:** Uses first `X-Forwarded-For` if present, else `req.ip`.  
  If app is behind a trusted proxy that sets `X-Forwarded-For`, Express must be configured with `app.set('trust proxy', 1)` (or appropriate count) so `req.ip` is the client IP. Otherwise all clients can appear as one IP.  
  If `X-Forwarded-For` is not stripped by the proxy, an attacker can spoof it and bypass or abuse rate limits. **High** when behind proxy without proper trust/proxy config.

### 4.3 Helmet / CSP

- **CSP:** `styleSrc` includes `'unsafe-inline'` — weakens XSS protection. **Low** for API-only; relevant if API serves HTML or error pages with inline styles.
- **HSTS:** Enabled (1y, includeSubDomains, preload). OK.
- **crossOriginResourcePolicy: 'cross-origin'**: Allows cross-origin loads. OK for API.

---

## 5) Risk Ratings and Top 5 Patches

### Risk Summary

| Category | Rating | Blocker for prod? |
|----------|--------|--------------------|
| BOLA (menu-permissions) | **Critical** | Yes |
| CORS (auth OPTIONS) | **Critical** | Yes |
| Settings key allowlist | **High** | Yes |
| Token revocation / replay | **High** | Recommended |
| Rate limit proxy / IP trust | **High** | Yes (if behind proxy) |
| Public inquiry rate limit + validation | **High** | Yes |
| Roles list permission | **Medium** | No |
| Error handler production safety | **Medium** | Recommended |

---

### Patch 1 — Menu-permissions: Restrict to admin (Critical)

**File:** `backend/src/routes/menuPermissions.ts`

- Add `requireRole('super_admin', 'admin')` (or equivalent) so only admins can read/update any role’s menu permissions. Keep `authenticate` and apply role check before handlers that read or modify role-level data.

---

### Patch 2 — Auth OPTIONS: Remove CORS bypass (Critical)

**File:** `backend/src/routes/auth.ts`

- Do not set `Access-Control-Allow-Origin` to `req.headers.origin` or `'*'` in OPTIONS handlers. Let the global `cors(corsOptions)` handle preflight so only whitelisted origins get `Access-Control-Allow-Origin`. Either remove custom OPTIONS for `/login` and `/refresh` or make them call the same origin callback as `corsOptions`.

---

### Patch 3 — Settings: Allowlist keys (High)

**File:** `backend/src/controllers/settingsController.ts` (and optionally a small allowlist in config)

- Define an allowlist of setting keys that are allowed to be updated via API (e.g. from env or a constant array). In `updateSetting`, if `key` is not in the allowlist, return 400. Validate `value` type/length per key if needed.

---

### Patch 4 — Rate limiting: Proxy trust + inquiry rate limit (High)

**File:** `backend/src/index.ts`  
- Set `app.set('trust proxy', 1)` (or the correct number of proxies) before any middleware that uses `req.ip` or rate limiters, so rate limiting uses the real client IP when behind a proxy.

**File:** `backend/src/middleware/rateLimiter.ts`  
- Optionally: when `trust proxy` is enabled, only use `X-Forwarded-For` if the request is from a trusted proxy (e.g. from internal IP or via a header only your proxy sets). Otherwise prefer `req.ip` after `trust proxy` is set.

**File:** `backend/src/routes/inquiries.ts`  
- Apply a strict rate limiter (e.g. 10 requests per 15 minutes per IP) to `POST /` (createInquiry). Add request body validation (max length, sanitization) in `createInquiry`.

---

### Patch 5 — Error handler: Production safety (Medium)

**File:** `backend/src/middleware/errorHandler.ts`

- In production (`NODE_ENV === 'production'`): do not send `error.message` for non-AppError 5xx responses; send a generic “Internal server error”. Do not attach `type`, `code`, or `stack` in the JSON response. Log full details server-side only. Ensure database-related messages never mention DATABASE_URL or internal details.

---

## Go / No-Go Decision

**No-Go for production** until the following are done:

1. **Critical:** Restrict menu-permissions to admin only (Patch 1).  
2. **Critical:** Fix auth OPTIONS CORS so preflight does not reflect arbitrary Origin (Patch 2).  
3. **High:** Add settings key allowlist (Patch 3).  
4. **High:** Configure `trust proxy` and (if applicable) harden rate limiter IP handling; add rate limit and validation for public createInquiry (Patch 4).

**Go with risk** (if business accepts token and TOCTOU residual risk):

- After the above four items, the remaining critical and high blockers are addressed.  
- Token revocation and replay prevention remain high recommendations; implement refresh storage and logout/refresh invalidation before or soon after launch.  
- Apply error-handler production hardening (Patch 5) and document CORS/upload behavior and role/permission model for operations.

**Summary:** Fix the two critical (menu-permissions BOLA, auth CORS) and the two high (settings allowlist, rate limit + inquiry) items for a **Go**. Add token revocation and error-handler hardening for a stronger production posture.

---

## Applied Patches (Post-Review)

The following patches have been applied in code:

1. **Menu-permissions** — `requireRole('super_admin', 'admin')` added to `getAllMenuPermissions`, `getRoleMenuPermissions`, `updateRoleMenuPermissions`, `toggleMenuPermission`. Routes `/me` and `/available-menus` remain available to any authenticated user.
2. **Auth CORS** — Custom OPTIONS handlers for `/login` and `/refresh` removed so global `cors(corsOptions)` handles preflight with the same origin whitelist.
3. **Settings allowlist** — `ALLOWED_SETTING_KEYS` added in `settingsController.ts`; `updateSetting` rejects keys not in the set and validates key format (`[a-zA-Z0-9_]`).
4. **Trust proxy + inquiry** — `app.set('trust proxy', 1)` added in `index.ts`. `inquiryLimiter` (10 req/15 min) applied to `POST /api/inquiries`. `createInquiry` validation added (lengths, email format, trim).
5. **Error handler** — Production branch explicitly uses `isProduction`; no stack/code/type in JSON response in production; internal error message remains generic.
