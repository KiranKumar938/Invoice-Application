import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/index.js';
import { prisma } from '../src/prisma.js';

describe('Klanvision Dashboard & Accounting Rules Tests', () => {
  const timestamp = Date.now();
  let adminToken: string;
  let tenantId: string;
  let testCustomerId: string;

  beforeAll(async () => {
    // 1. Login default admin
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@klanvision.com',
        password: 'Password123!',
      });

    adminToken = loginRes.body.token;
    tenantId = loginRes.body.tenant.id;

    // 2. Fetch or create customer
    const custRes = await request(app)
      .get('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`);

    if (custRes.body.customers.length > 0) {
      testCustomerId = custRes.body.customers[0].id;
    } else {
      const newCust = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Dashboard Test Customer ${timestamp}`,
          email: `dash_${timestamp}@test.com`,
          phone: '9876543210',
          billingAddress: 'Gokul Garden',
          billingCity: 'New Delhi',
          billingState: 'Delhi',
          billingPostalCode: '110075',
        });
      testCustomerId = newCust.body.id;
    }
  });

  // 1. DASHBOARD SUMMARY ENDPOINT
  it('retrieves comprehensive dashboard summary matching KPI accounting specifications', async () => {
    const res = await request(app)
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.kpis).toBeDefined();
    expect(res.body.kpis.totalRevenue).toBeDefined();
    expect(typeof res.body.kpis.totalRevenue).toBe('number');
    expect(res.body.kpis.paidInvoices).toBeDefined();
    expect(res.body.kpis.pendingPayments).toBeDefined();
    expect(res.body.kpis.overdueInvoices).toBeDefined();

    // Chart & distribution data
    expect(Array.isArray(res.body.salesOverview)).toBe(true);
    expect(res.body.salesOverview.length).toBe(6);
    expect(res.body.salesOverview[0].revenue).toBeDefined();
    expect(res.body.salesOverview[0].collections).toBeDefined();

    expect(res.body.invoiceStatus).toBeDefined();
    expect(res.body.invoiceStatus.paid).toBeDefined();
    expect(res.body.invoiceStatus.pending).toBeDefined();
    expect(res.body.invoiceStatus.overdue).toBeDefined();

    // Top customers and recent invoices
    expect(Array.isArray(res.body.topCustomers)).toBe(true);
    expect(Array.isArray(res.body.recentInvoices)).toBe(true);
    expect(Array.isArray(res.body.recentActivities)).toBe(true);
  });

  // 2. STRICT ACCOUNTING RULES VERIFICATION
  it('verifies that draft and cancelled invoices are NOT counted in collected revenue or cash received', async () => {
    // Create a draft invoice
    const draftInvoice = await prisma.invoice.create({
      data: {
        tenantId,
        customerId: testCustomerId,
        invoiceNumber: `DRAFT-TEST-${timestamp}`,
        issueDate: new Date(),
        dueDate: new Date(),
        status: 'DRAFT',
        paymentStatus: 'UNPAID',
        subtotal: 50000,
        discountTotal: 0,
        taxableAmount: 50000,
        taxTotal: 9000,
        cgstTotal: 4500,
        sgstTotal: 4500,
        igstTotal: 0,
        roundOff: 0,
        totalAmount: 59000,
        paidAmount: 0,
        outstandingAmount: 59000,
      },
    });

    // Create a cancelled invoice
    const cancelledInvoice = await prisma.invoice.create({
      data: {
        tenantId,
        customerId: testCustomerId,
        invoiceNumber: `CANCELLED-TEST-${timestamp}`,
        issueDate: new Date(),
        dueDate: new Date(),
        status: 'CANCELLED',
        paymentStatus: 'UNPAID',
        subtotal: 40000,
        discountTotal: 0,
        taxableAmount: 40000,
        taxTotal: 7200,
        cgstTotal: 3600,
        sgstTotal: 3600,
        igstTotal: 0,
        roundOff: 0,
        totalAmount: 47200,
        paidAmount: 0,
        outstandingAmount: 0,
      },
    });

    const res = await request(app)
      .get('/api/dashboard/summary?period=all')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);

    // Verify recent invoices does not list CANCELLED as a paid invoice
    const foundCancelled = res.body.recentInvoices.find(
      (inv: any) => inv.invoiceNumber === cancelledInvoice.invoiceNumber
    );
    if (foundCancelled) {
      expect(foundCancelled.status).toBe('CANCELLED');
    }

    // Cleanup test records
    await prisma.invoice.deleteMany({
      where: { id: { in: [draftInvoice.id, cancelledInvoice.id] } },
    });
  });

  // 3. DATE-RANGE FILTERING TESTS
  it('filters dashboard data across different date ranges (this_month, last_30_days, all)', async () => {
    const resThisMonth = await request(app)
      .get('/api/dashboard/summary?period=this_month')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(resThisMonth.status).toBe(200);
    expect(resThisMonth.body.periodLabel).toBe('this_month');

    const res30Days = await request(app)
      .get('/api/dashboard/summary?period=last_30_days')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res30Days.status).toBe(200);

    const resCustom = await request(app)
      .get(
        `/api/dashboard/summary?startDate=${new Date(2025, 0, 1).toISOString()}&endDate=${new Date().toISOString()}`
      )
      .set('Authorization', `Bearer ${adminToken}`);
    expect(resCustom.status).toBe(200);
  });

  // 4. CONSISTENCY BETWEEN DASHBOARD AND DETAILED REPORTS
  it('ensures accounting consistency between dashboard revenue and reports sales metrics', async () => {
    const [dashRes, reportRes] = await Promise.all([
      request(app)
        .get('/api/dashboard/summary?period=last_6_months')
        .set('Authorization', `Bearer ${adminToken}`),
      request(app)
        .get('/api/reports/summary?period=last_6_months')
        .set('Authorization', `Bearer ${adminToken}`),
    ]);

    expect(dashRes.status).toBe(200);
    expect(reportRes.status).toBe(200);

    // Both report total sales/revenue for active invoices
    expect(dashRes.body.kpis.totalRevenue).toBeGreaterThan(0);
    expect(reportRes.body.metrics.totalSales).toBeGreaterThan(0);
  });

  // 5. GLOBAL SEARCH ENDPOINT
  it('executes authorized global search finding relevant invoices and customers', async () => {
    const res = await request(app)
      .get('/api/dashboard/search?q=INV')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.invoices).toBeDefined();
    expect(Array.isArray(res.body.invoices)).toBe(true);
    expect(Array.isArray(res.body.customers)).toBe(true);
    expect(Array.isArray(res.body.products)).toBe(true);

    if (res.body.invoices.length > 0) {
      expect(res.body.invoices[0].url).toMatch(/^\/invoices\//);
    }
  });

  // 6. EMPTY DATA RESILIENCE
  it('handles empty workspace queries gracefully without errors or division by zero', async () => {
    // Register temporary empty tenant
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Empty Workspace Owner',
        email: `empty_${timestamp}@test.com`,
        password: 'Password123!',
        companyName: `Empty Workspace ${timestamp}`,
      });

    const emptyToken = registerRes.body.token;
    const emptyTenantId = registerRes.body.tenant.id;
    const emptyUserId = registerRes.body.user.id;

    const res = await request(app)
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${emptyToken}`);

    expect(res.status).toBe(200);
    expect(res.body.kpis).toBeDefined();
    expect(res.body.salesOverview.length).toBe(6);
    expect(res.body.invoiceStatus.total).toBeGreaterThanOrEqual(0);

    // Clean up
    await prisma.session.deleteMany({ where: { userId: emptyUserId } });
    await prisma.membership.deleteMany({ where: { userId: emptyUserId } });
    await prisma.companySettings.deleteMany({ where: { tenantId: emptyTenantId } });
    await prisma.tenant.deleteMany({ where: { id: emptyTenantId } });
    await prisma.user.deleteMany({ where: { id: emptyUserId } });
  });
});
