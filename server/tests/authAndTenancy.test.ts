import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/index.js';
import { prisma } from '../src/prisma.js';

describe('Authentication and Multi-Tenant Isolation', () => {
  let adminToken: string;
  let tenantId: string;

  beforeAll(async () => {
    // Authenticate with seeded admin
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@klanvision.com',
        password: 'Password123!',
      });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    adminToken = res.body.token;
    tenantId = res.body.tenant.id;
  });

  it('rejects unauthorized requests without token', async () => {
    const res = await request(app).get('/api/customers');
    expect(res.status).toBe(401);
  });

  it('allows authorized requests with valid token', async () => {
    const res = await request(app)
      .get('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.customers).toBeInstanceOf(Array);
    expect(res.body.customers.length).toBeGreaterThan(0);
  });

  it('enforces multi-tenant isolation', async () => {
    // Create a secondary tenant user
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Secondary Admin',
        email: `secondary_${Date.now()}@test.com`,
        password: 'Password123!',
        companyName: 'Secondary Enterprise Pvt Ltd',
      });

    expect(regRes.status).toBe(201);
    const secondaryToken = regRes.body.token;

    // Fetch customers using secondary tenant token - should NOT see primary tenant's customers!
    const secCustRes = await request(app)
      .get('/api/customers')
      .set('Authorization', `Bearer ${secondaryToken}`);

    expect(secCustRes.status).toBe(200);
    // Should have 0 customers initially
    expect(secCustRes.body.customers.length).toBe(0);

    // Primary tenant still has their customers
    const primCustRes = await request(app)
      .get('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(primCustRes.body.customers.length).toBeGreaterThan(0);
  });
});
