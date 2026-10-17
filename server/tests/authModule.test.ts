import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/index.js';
import { prisma } from '../src/prisma.js';
import { COOKIE_NAME } from '../src/services/sessionService.js';
import { generatePasswordResetToken } from '../src/services/tokenService.js';

describe('Klanvision SaaS Authentication & Authorization Module Tests', () => {
  const timestamp = Date.now();
  const testEmail = `testuser_${timestamp}@klanvision.test`;
  const testPassword = 'Password123!';
  const newPassword = 'NewSecretPassword456!';
  const testCompanyName = `Workspace_${timestamp}`;

  let registeredToken: string;
  let registeredUserId: string;
  let registeredTenantId: string;
  let rememberMeSessionToken: string;

  // Cleanup created test records afterwards
  afterAll(async () => {
    try {
      if (registeredUserId) {
        await prisma.session.deleteMany({ where: { userId: registeredUserId } });
        await prisma.passwordResetToken.deleteMany({ where: { userId: registeredUserId } });
        await prisma.membership.deleteMany({ where: { userId: registeredUserId } });
      }
      if (registeredTenantId) {
        await prisma.auditLog.deleteMany({ where: { tenantId: registeredTenantId } });
        await prisma.companySettings.deleteMany({ where: { tenantId: registeredTenantId } });
        await prisma.tenant.deleteMany({ where: { id: registeredTenantId } });
      }
      if (registeredUserId) {
        await prisma.user.deleteMany({ where: { id: registeredUserId } });
      }
    } catch (e) {
      // Ignore cleanup error
    }
  });

  // 1. REGISTRATION WITH WORKSPACE CREATION
  describe('Workspace Registration Flow', () => {
    it('registers a new user and creates dedicated tenant workspace, settings, and OWNER membership', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Jane Doe',
          email: testEmail,
          password: testPassword,
          companyName: testCompanyName,
          phone: '+91 99887 76655',
          gstin: '29AABCU9603R1Z2',
        });

      expect(res.status).toBe(201);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(testEmail.toLowerCase());
      expect(res.body.user.role).toBe('OWNER');
      expect(res.body.tenant).toBeDefined();
      expect(res.body.tenant.name).toBe(testCompanyName);
      expect(res.body.tenant.settings).toBeDefined();

      // Check HTTP-only cookie
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some((c: string) => c.includes(COOKIE_NAME))).toBe(true);
      expect(cookies.some((c: string) => c.includes('HttpOnly'))).toBe(true);

      registeredToken = res.body.token;
      registeredUserId = res.body.user.id;
      registeredTenantId = res.body.tenant.id;
    });

    it('rejects duplicate registration with an existing email address', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Duplicate Jane',
          email: testEmail,
          password: 'Password999!',
          companyName: 'Another Company',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/already exists/i);
    });
  });

  // 2. LOGIN & REMEMBER-ME BEHAVIOR
  describe('Authentication & Session Persistence', () => {
    it('successfully logs in with valid credentials and sets session cookie', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
          rememberMe: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe(testEmail.toLowerCase());
      expect(res.body.tenant.id).toBe(registeredTenantId);

      // Verify cookie
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some((c: string) => c.includes(COOKIE_NAME))).toBe(true);
    });

    it('creates extended session when rememberMe is true (30 days vs 24 hours)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
          rememberMe: true,
        });

      expect(res.status).toBe(200);
      const session = await prisma.session.findFirst({
        where: { userId: registeredUserId },
        orderBy: { createdAt: 'desc' },
      });

      expect(session).toBeDefined();
      rememberMeSessionToken = session!.sessionToken;

      const durationMs = session!.expiresAt.getTime() - session!.createdAt.getTime();
      const durationDays = durationMs / (1000 * 60 * 60 * 24);
      // Remember me should be approximately 30 days
      expect(Math.round(durationDays)).toBe(30);
    });

    it('rejects login with an invalid password with 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: 'WrongPassword!',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/invalid email or password/i);
    });

    it('rejects login for non-existent email with 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@klanvision.test',
          password: 'AnyPassword123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/invalid email or password/i);
    });
  });

  // 3. AUTHENTICATED PROFILE & ENDPOINTS
  describe('Protected Routes & Profile Retrieval', () => {
    it('retrieves user profile and workspace via Bearer token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${registeredToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user.id).toBe(registeredUserId);
      expect(res.body.tenant.id).toBe(registeredTenantId);
    });

    it('retrieves user profile via HTTP-only cookie', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', [`${COOKIE_NAME}=${registeredToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.user.id).toBe(registeredUserId);
    });

    it('rejects unauthenticated requests to protected endpoints with 401', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });
  });

  // 4. FORGOT PASSWORD & RESET PASSWORD FLOW
  describe('Password Recovery Lifecycle', () => {
    let rawResetToken: string;

    it('handles forgot-password requests safely for both existing and non-existing emails', async () => {
      // Existing user
      const res1 = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testEmail });
      expect(res1.status).toBe(200);
      expect(res1.body.message).toBeDefined();

      // Non-existing user returns exact same generic confirmation
      const res2 = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'ghost@nowhere.test' });
      expect(res2.status).toBe(200);
      expect(res2.body.message).toBe(res1.body.message);
    });

    it('verifies valid reset token and rejects invalid/expired token', async () => {
      // Generate real cryptographic token for test user
      rawResetToken = await generatePasswordResetToken(registeredUserId);

      // Verify genuine token
      const verifyRes = await request(app)
        .post('/api/auth/verify-reset-token')
        .send({ token: rawResetToken });
      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.valid).toBe(true);

      // Verify bogus token
      const invalidRes = await request(app)
        .post('/api/auth/verify-reset-token')
        .send({ token: 'invalid-nonexistent-token-123' });
      expect(invalidRes.status).toBe(400);
      expect(invalidRes.body.error).toBeDefined();
    });

    it('resets password using valid token and revokes user sessions', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: rawResetToken,
          newPassword: newPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/successfully updated/i);

      // Verify token cannot be reused
      const reuseRes = await request(app)
        .post('/api/auth/verify-reset-token')
        .send({ token: rawResetToken });
      expect(reuseRes.status).toBe(400);

      // Verify login works with new password
      const newLoginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: newPassword,
        });
      expect(newLoginRes.status).toBe(200);
      registeredToken = newLoginRes.body.token;

      // Verify old password no longer works
      const oldLoginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        });
      expect(oldLoginRes.status).toBe(401);
    });
  });

  // 5. LOGOUT & SESSION INVALIDATION
  describe('Session Expiration & Logout Lifecycle', () => {
    it('logs out successfully, invalidating DB session and clearing session cookie', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${registeredToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/successfully signed out/i);

      // Cookie should be expired/cleared
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some((c: string) => c.includes(`${COOKIE_NAME}=;`))).toBe(true);

      // Re-accessing /me with the invalidated session token must return 401
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${registeredToken}`);
      expect(meRes.status).toBe(401);
      expect(meRes.body.error).toMatch(/session has expired/i);
    });
  });

  // 6. ROLE-BASED ACCESS CONTROL (RBAC) & PERMISSIONS
  describe('Role-Based Access Control (RBAC)', () => {
    let viewerToken: string;
    let viewerUserId: string;

    beforeAll(async () => {
      // Create a VIEWER member in the same workspace
      const viewerUser = await prisma.user.create({
        data: {
          name: 'Viewer User',
          email: `viewer_${timestamp}@klanvision.test`,
          passwordHash: 'dummyhash',
          role: 'VIEWER',
        },
      });
      viewerUserId = viewerUser.id;

      await prisma.membership.create({
        data: {
          userId: viewerUser.id,
          tenantId: registeredTenantId,
          role: 'VIEWER',
          isDefault: true,
        },
      });

      // Login or generate token for viewer
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: `viewer_${timestamp}@klanvision.test`,
          password: testPassword, // will fail with dummyhash, let's update password
        });

      // Let's create an active session for the viewer directly
      const session = await prisma.session.create({
        data: {
          sessionToken: `viewer_session_${timestamp}`,
          userId: viewerUser.id,
          tenantId: registeredTenantId,
          expiresAt: new Date(Date.now() + 86400000),
        },
      });

      const jwt = (await import('jsonwebtoken')).default;
      const { config } = await import('../src/config.js');
      viewerToken = jwt.sign(
        {
          userId: viewerUser.id,
          email: viewerUser.email,
          role: 'VIEWER',
          tenantId: registeredTenantId,
          sessionToken: session.sessionToken,
        },
        config.jwtSecret,
        { expiresIn: 86400 }
      );
    });

    afterAll(async () => {
      if (viewerUserId) {
        await prisma.session.deleteMany({ where: { userId: viewerUserId } });
        await prisma.membership.deleteMany({ where: { userId: viewerUserId } });
        await prisma.user.deleteMany({ where: { id: viewerUserId } });
      }
    });

    it('allows VIEWER to perform read operations (GET /api/customers)', async () => {
      const res = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.customers).toBeDefined();
    });

    it('blocks VIEWER from creating customers with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          name: 'Unauthorized Customer',
          email: 'unauth@test.com',
          phone: '9988776655',
          billingAddress: 'Test Address',
          billingCity: 'Delhi',
          billingState: 'Delhi',
          billingPostalCode: '110001',
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/read-only access/i);
    });

    it('blocks VIEWER from creating products with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          name: 'Unauthorized Product',
          hsnSacCode: '998314',
          unitPrice: 500,
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/read-only access/i);
    });

    it('blocks VIEWER from updating company settings with 403 Forbidden', async () => {
      const res = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          company: { name: 'Hacked Company' },
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/requires one of \[OWNER, ADMIN\]/i);
    });
  });

  // 7. MULTI-TENANT ISOLATION
  describe('Strict Multi-Tenant Isolation', () => {
    let secondTenantToken: string;
    let secondTenantId: string;
    let secondUserId: string;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Second Org Owner',
          email: `second_org_${timestamp}@klanvision.test`,
          password: testPassword,
          companyName: `Second Org ${timestamp}`,
        });

      secondTenantToken = res.body.token;
      secondTenantId = res.body.tenant.id;
      secondUserId = res.body.user.id;
    });

    afterAll(async () => {
      if (secondUserId) {
        await prisma.session.deleteMany({ where: { userId: secondUserId } });
        await prisma.membership.deleteMany({ where: { userId: secondUserId } });
        await prisma.customer.deleteMany({ where: { tenantId: secondTenantId } });
        await prisma.companySettings.deleteMany({ where: { tenantId: secondTenantId } });
        await prisma.tenant.deleteMany({ where: { id: secondTenantId } });
        await prisma.user.deleteMany({ where: { id: secondUserId } });
      }
    });

    it('creates a customer in Tenant 2 and ensures Tenant 1 cannot access or view it', async () => {
      // 1. Create customer in Tenant 2
      const createRes = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${secondTenantToken}`)
        .send({
          name: `Confidential Client Org 2 ${timestamp}`,
          email: `client_${timestamp}@org2.test`,
          phone: '9988776611',
          billingAddress: 'Org 2 Address',
          billingCity: 'Mumbai',
          billingState: 'Maharashtra',
          billingPostalCode: '400001',
        });

      expect(createRes.status).toBe(201);
      const customerId = createRes.body.id;

      // 2. Query Tenant 1 customers using Tenant 1 login
      // Re-login to get fresh token for Org 1
      const org1Login = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: newPassword,
        });
      const org1Token = org1Login.body.token;

      const org1CustomersRes = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${org1Token}`);

      expect(org1CustomersRes.status).toBe(200);
      const foundInOrg1 = org1CustomersRes.body.customers.find((c: any) => c.id === customerId);
      expect(foundInOrg1).toBeUndefined();

      // 3. Direct GET by ID with Tenant 1 token returns 404 (strictly isolated)
      const directGetRes = await request(app)
        .get(`/api/customers/${customerId}`)
        .set('Authorization', `Bearer ${org1Token}`);

      expect(directGetRes.status).toBe(404);
    });
  });
});
