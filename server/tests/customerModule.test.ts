import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/index.js';
import { prisma } from '../src/prisma.js';

describe('Klanvision Customer Management Module Tests', () => {
  const timestamp = Date.now();
  let adminToken: string;
  let tenantId: string;
  let testCustomerId: string;

  beforeAll(async () => {
    // Authenticate Admin
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@klanvision.com',
        password: 'Password123!',
      });

    adminToken = loginRes.body.token;
    tenantId = loginRes.body.tenant.id;

    // Clean up any leftovers from previous test runs to ensure idempotency
    const matchingCusts = await prisma.customer.findMany({
      where: {
        OR: [
          { email: { contains: 'acmeindustrial.test' } },
          { gstin: '29AAACT9876Q1Z4' },
          { name: { contains: 'Acme Industrial' } },
        ],
      },
      select: { id: true },
    });
    const ids = matchingCusts.map((c) => c.id);
    if (ids.length > 0) {
      await prisma.invoiceLineItem.deleteMany({ where: { invoice: { customerId: { in: ids } } } });
      await prisma.paymentAllocation.deleteMany({ where: { invoice: { customerId: { in: ids } } } });
      await prisma.payment.deleteMany({ where: { customerId: { in: ids } } });
      await prisma.invoice.deleteMany({ where: { customerId: { in: ids } } });
      await prisma.customer.deleteMany({ where: { id: { in: ids } } });
    }
  });

  // 1. CUSTOMER CREATION & VALIDATION
  describe('Customer Creation & Validations', () => {
    const uniqueGstin = '29AAACT9876Q1Z4';
    const uniquePan = 'AAACT9876Q';

    it('creates a new business customer with valid GSTIN and PAN', async () => {
      const payload = {
        name: `Acme Industrial Systems ${timestamp}`,
        type: 'BUSINESS',
        email: `contact_${timestamp}@acmeindustrial.test`,
        phone: '9876543210',
        gstin: uniqueGstin,
        pan: uniquePan,
        billingAddress: 'Plot 45, Peenya Industrial Area',
        billingCity: 'Bengaluru',
        billingState: 'Karnataka',
        billingPostalCode: '560058',
        billingCountry: 'India',
        openingBalance: 15000,
        notes: 'Premium client with Net-30 credit terms',
      };

      const res = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe(payload.name);
      expect(res.body.gstin).toBe(uniqueGstin);
      expect(res.body.pan).toBe(uniquePan);
      expect(res.body.currentOutstanding).toBe(15000);

      testCustomerId = res.body.id;
    });

    it('rejects duplicate email within the same tenant workspace', async () => {
      const res = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Duplicate Email Corp',
          email: `contact_${timestamp}@acmeindustrial.test`,
          phone: '9876543211',
          billingAddress: 'Street 1',
          billingCity: 'Delhi',
          billingState: 'Delhi',
          billingPostalCode: '110001',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/already exists in your workspace/i);
    });

    it('rejects duplicate GSTIN within the same tenant workspace', async () => {
      const res = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Duplicate GSTIN Corp',
          email: `another_${timestamp}@acme.test`,
          phone: '9876543212',
          gstin: uniqueGstin, // Same GSTIN as created above
          billingAddress: 'Street 2',
          billingCity: 'Delhi',
          billingState: 'Delhi',
          billingPostalCode: '110001',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/already exists in your workspace/i);
    });

    it('rejects invalid GSTIN format with 400', async () => {
      const res = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Invalid GSTIN Corp',
          email: `invalid_gstin_${timestamp}@test.com`,
          phone: '9876543210',
          gstin: 'INVALID123',
          billingAddress: 'Street 3',
          billingCity: 'Delhi',
          billingState: 'Delhi',
          billingPostalCode: '110001',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/invalid GSTIN format/i);
    });

    it('rejects invalid PAN format with 400', async () => {
      const res = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Invalid PAN Corp',
          email: `invalid_pan_${timestamp}@test.com`,
          phone: '9876543210',
          pan: 'INVALIDPAN',
          billingAddress: 'Street 4',
          billingCity: 'Delhi',
          billingState: 'Delhi',
          billingPostalCode: '110001',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/invalid PAN format/i);
    });
  });

  // 2. CUSTOMER DETAILS & FINANCIAL SUMMARY
  describe('Customer Details & Financial Summary', () => {
    it('retrieves customer details with computed financial summary', async () => {
      const res = await request(app)
        .get(`/api/customers/${testCustomerId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testCustomerId);
      expect(res.body.summary).toBeDefined();
      expect(res.body.summary.currentOutstanding).toBe(15000);
      expect(res.body.summary.totalInvoices).toBeDefined();
      expect(Array.isArray(res.body.invoices)).toBe(true);
      expect(Array.isArray(res.body.payments)).toBe(true);
    });

    it('updates customer details successfully', async () => {
      const res = await request(app)
        .put(`/api/customers/${testCustomerId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          phone: '9123456789',
          notes: 'Updated billing instructions',
        });

      expect(res.status).toBe(200);
      expect(res.body.phone).toBe('9123456789');
      expect(res.body.notes).toBe('Updated billing instructions');
    });
  });

  // 3. EXPORT TO CSV
  describe('Customer CSV Export', () => {
    it('exports tenant customers to well-formatted CSV file', async () => {
      const res = await request(app)
        .get('/api/customers/export')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.headers['content-disposition']).toMatch(/attachment; filename=/);
      expect(res.text).toContain('Customer Name,Customer Type,Email,Phone,GSTIN,PAN');
      expect(res.text).toContain(`Acme Industrial Systems ${timestamp}`);
    });
  });

  // 4. SAFE ARCHIVING & DELETION RULES
  describe('Safe Archiving & Deletion Rules', () => {
    let customerWithInvoiceId: string;
    let invoiceId: string;

    beforeAll(async () => {
      // Create customer with an invoice
      const cust = await prisma.customer.create({
        data: {
          tenantId,
          name: `Client With Invoices ${timestamp}`,
          email: `invoiced_${timestamp}@test.com`,
          phone: '9876543219',
          billingAddress: 'Sector 15',
          billingCity: 'Gurugram',
          billingState: 'Haryana',
          billingPostalCode: '122001',
        },
      });
      customerWithInvoiceId = cust.id;

      const inv = await prisma.invoice.create({
        data: {
          tenantId,
          customerId: cust.id,
          invoiceNumber: `TEST-INV-${timestamp}`,
          issueDate: new Date(),
          dueDate: new Date(),
          status: 'ISSUED',
          paymentStatus: 'UNPAID',
          subtotal: 10000,
          discountTotal: 0,
          taxableAmount: 10000,
          taxTotal: 1800,
          cgstTotal: 900,
          sgstTotal: 900,
          igstTotal: 0,
          roundOff: 0,
          totalAmount: 11800,
          paidAmount: 0,
          outstandingAmount: 11800,
        },
      });
      invoiceId = inv.id;
    });

    afterAll(async () => {
      if (invoiceId) {
        await prisma.invoice.deleteMany({ where: { id: invoiceId } });
      }
      if (customerWithInvoiceId) {
        await prisma.customer.deleteMany({ where: { id: customerWithInvoiceId } });
      }
    });

    it('blocks deletion of a customer who has existing invoices (safe archiving)', async () => {
      const res = await request(app)
        .delete(`/api/customers/${customerWithInvoiceId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Cannot delete customer with existing invoices/i);
    });

    it('allows deleting a customer without invoices', async () => {
      const deleteRes = await request(app)
        .delete(`/api/customers/${testCustomerId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.message).toMatch(/deleted successfully/i);

      // Verify customer is gone
      const checkRes = await request(app)
        .get(`/api/customers/${testCustomerId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(checkRes.status).toBe(404);
    });
  });

  // 5. TENANT ISOLATION
  describe('Multi-Tenant Data Isolation', () => {
    let secondTenantToken: string;
    let secondTenantId: string;
    let secondUserId: string;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Customer Isolation Owner',
          email: `cust_isolation_${timestamp}@test.com`,
          password: 'Password123!',
          companyName: `Isolation Corp ${timestamp}`,
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

    it('ensures Tenant B cannot access or export Tenant A customers', async () => {
      // Create confidential customer in Tenant B
      const createRes = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${secondTenantToken}`)
        .send({
          name: `Tenant B Confidential ${timestamp}`,
          email: `b_secret_${timestamp}@test.com`,
          phone: '9888877777',
          billingAddress: 'Street B',
          billingCity: 'Pune',
          billingState: 'Maharashtra',
          billingPostalCode: '411001',
        });
      expect(createRes.status).toBe(201);
      const bCustomerId = createRes.body.id;

      // Tenant A tries to access Tenant B's customer
      const accessRes = await request(app)
        .get(`/api/customers/${bCustomerId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(accessRes.status).toBe(404);

      // Tenant A exports CSV, ensuring Tenant B's customer is not included
      const exportRes = await request(app)
        .get('/api/customers/export')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(exportRes.status).toBe(200);
      expect(exportRes.text).not.toContain(`Tenant B Confidential ${timestamp}`);
    });
  });
});
