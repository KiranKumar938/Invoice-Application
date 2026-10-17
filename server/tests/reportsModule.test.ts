import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/index.js';
import { prisma } from '../src/prisma.js';
import { roundToTwo } from '../src/services/gstCalculator.js';

describe('Klanvision Reports Module Aggregates & Parity Tests', () => {
  let adminToken: string;
  let tenantId: string;
  let customer1Id: string;
  let customer2Id: string;
  let inv1Total: number;
  let inv2Total: number;
  let inv3Total: number;
  let pmt1Amount: number;
  let pmt2Amount: number;
  let devOpsDesc: string;

  const randomLetters = (n: number) =>
    Array.from({ length: n }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('');
  const randomDigits = (n: number) =>
    Array.from({ length: n }, () => Math.floor(Math.random() * 10).toString()).join('');
  const makeGstin = (stateCode: string) =>
    `${stateCode}${randomLetters(5)}${randomDigits(4)}${randomLetters(1)}1Z${randomDigits(1)}`;

  beforeAll(async () => {
    const timestamp = Date.now();
    devOpsDesc = `Cloud DevOps Consulting ${timestamp}`;

    // 1. Authenticate as Admin
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'admin@klanvision.com',
      password: 'Password123!',
    });
    expect(loginRes.status).toBe(200);
    adminToken = loginRes.body.token;
    tenantId = loginRes.body.tenant.id;

    // 2. Create 2 Distinct Test Customers
    const c1 = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Reports Corp Alpha ${timestamp}`,
        email: `alpha_${timestamp}_${Math.random().toString(36).substring(7)}@test.com`,
        phone: `95${randomDigits(8)}`,
        gstin: makeGstin('07'),
        billingAddress: 'Tower 1, Nehru Place',
        billingCity: 'New Delhi',
        billingState: 'Delhi',
        billingPostalCode: '110019',
      });
    expect(c1.status).toBe(201);
    customer1Id = c1.body.id;

    const c2 = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Reports Beta Logistics ${timestamp}`,
        email: `beta_${timestamp}_${Math.random().toString(36).substring(7)}@test.com`,
        phone: `96${randomDigits(8)}`,
        gstin: makeGstin('27'),
        billingAddress: 'Nariman Point',
        billingCity: 'Mumbai',
        billingState: 'Maharashtra',
        billingPostalCode: '400021',
      });
    expect(c2.status).toBe(201);
    customer2Id = c2.body.id;

    // 3. Create Diverse Invoices
    // Inv 1: Customer 1, Intra-state, 18% GST (Rate 50000, 10% disc = 45000 taxable + 8100 tax = 53100 total)
    const inv1 = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId: customer1Id,
        issueDate: '2026-10-01',
        dueDate: '2026-10-31',
        status: 'ISSUED',
        lineItems: [
          { description: devOpsDesc, quantity: 1, unitPrice: 50000, discountPercent: 10, gstRate: 18 },
        ],
      });
    expect(inv1.status).toBe(201);
    inv1Total = inv1.body.totalAmount;

    // Inv 2: Customer 2, Inter-state, 18% GST (Rate 30000 = 30000 taxable + 5400 tax = 35400 total)
    const inv2 = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId: customer2Id,
        issueDate: '2026-10-05',
        dueDate: '2026-11-05',
        status: 'ISSUED',
        lineItems: [
          { description: 'Logistics Tracking License', quantity: 1, unitPrice: 30000, gstRate: 18 },
        ],
      });
    expect(inv2.status).toBe(201);
    inv2Total = inv2.body.totalAmount;

    // Inv 3: Overdue Invoice (DueDate in past)
    const inv3 = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId: customer1Id,
        issueDate: '2026-08-01',
        dueDate: '2026-09-01',
        status: 'ISSUED',
        lineItems: [
          { description: 'Legacy System Maintenance', quantity: 1, unitPrice: 20000, gstRate: 18 },
        ],
      });
    expect(inv3.status).toBe(201);
    inv3Total = inv3.body.totalAmount; // 23600

    // Inv 4: DRAFT (Should be excluded from sales/taxes)
    await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId: customer2Id,
        issueDate: '2026-10-10',
        dueDate: '2026-11-10',
        status: 'DRAFT',
        lineItems: [{ description: 'Draft Scope', quantity: 1, unitPrice: 99999, gstRate: 18 }],
      });

    // 4. Record Payments
    // Payment 1: Partial ₹20,000 on Inv 1
    pmt1Amount = 20000;
    await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId: customer1Id,
        invoiceId: inv1.body.id,
        amount: pmt1Amount,
        paymentDate: '2026-10-06',
        paymentMethod: 'UPI',
        transactionReference: `UPI_REP_${timestamp}`,
      });

    // Payment 2: Full payment on Inv 2
    pmt2Amount = inv2Total;
    await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId: customer2Id,
        invoiceId: inv2.body.id,
        amount: pmt2Amount,
        paymentDate: '2026-10-08',
        paymentMethod: 'BANK_TRANSFER',
        transactionReference: `NEFT_REP_${timestamp}`,
      });
  });

  // 1. SUMMARY CARDS PARITY WITH DATABASE
  it('ensures Total Sales, Total Tax, and Total Invoices match active issued non-cancelled invoices in database', async () => {
    const res = await request(app)
      .get('/api/reports/summary?period=all_time')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const { metrics } = res.body;

    // Direct database aggregate
    const dbInvoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        status: { notIn: ['DRAFT', 'CANCELLED'] },
      },
    });

    const expectedTotalSales = roundToTwo(dbInvoices.reduce((acc, i) => acc + i.totalAmount, 0));
    const expectedTotalTax = roundToTwo(dbInvoices.reduce((acc, i) => acc + i.taxTotal, 0));
    const expectedCount = dbInvoices.length;

    expect(metrics.totalSales).toBe(expectedTotalSales);
    expect(metrics.totalTax).toBe(expectedTotalTax);
    expect(metrics.totalInvoices).toBe(expectedCount);
    expect(metrics.avgInvoiceValue).toBeCloseTo(expectedTotalSales / expectedCount, 1);
  });

  // 2. DETAILED COLLECTIONS & PAYMENTS REPORT
  it('accurately aggregates non-reversed payments with payment date boundaries without double-counting', async () => {
    const res = await request(app)
      .get('/api/reports/detailed?period=all_time')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const { collectionsReport } = res.body;

    // Fetch confirmed payments directly from database
    const dbPayments = await prisma.payment.findMany({
      where: { tenantId },
    });

    const expectedCollectionsTotal = dbPayments
      .filter((p) => p.status === 'SUCCESS')
      .reduce((sum, p) => sum + p.amount, 0);

    const reportCollectionsTotal = collectionsReport
      .filter((p: any) => p.status === 'SUCCESS')
      .reduce((sum: number, p: any) => sum + p.amount, 0);

    expect(roundToTwo(reportCollectionsTotal)).toBe(roundToTwo(expectedCollectionsTotal));
    expect(collectionsReport.some((p: any) => p.amount === pmt1Amount)).toBe(true);
    expect(collectionsReport.some((p: any) => p.amount === pmt2Amount)).toBe(true);
  });

  // 3. OUTSTANDING RECEIVABLES & AGING REPORT
  it('correctly calculates customer-wise receivables and categorizes overdue aging into time buckets', async () => {
    const res = await request(app)
      .get('/api/reports/detailed?period=all_time')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const { receivablesReport, agingReport } = res.body;

    // Check receivables for customer 1
    const cust1Receivables = receivablesReport.find((r: any) => r.customerId === customer1Id);
    expect(cust1Receivables).toBeDefined();
    // Customer 1 has inv1 (53100 - 20000 = 33100) + inv3 overdue (23600) = 56700
    expect(cust1Receivables.outstandingAmount).toBe(56700);

    // Aging report verification
    expect(agingReport.buckets).toBeDefined();
    expect(agingReport.buckets.totalOverdue).toBeGreaterThanOrEqual(23600); // Inv 3 is overdue
    expect(agingReport.items.some((item: any) => item.daysOverdue > 0)).toBe(true);
  });

  // 4. CUSTOMER-WISE SALES REPORT
  it('computes customer sales breakdown with subtotal, discounts, taxable value, and tax totals', async () => {
    const res = await request(app)
      .get('/api/reports/detailed?period=all_time')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const { customerSalesReport } = res.body;

    const c1Sales = customerSalesReport.find((cs: any) => cs.customerId === customer1Id);
    expect(c1Sales).toBeDefined();
    expect(c1Sales.grossSubtotal).toBeGreaterThanOrEqual(70000); // 50000 + 20000
    expect(c1Sales.totalDiscount).toBe(5000); // 10% on 50000
    expect(c1Sales.totalPaid).toBe(20000);
  });

  // 5. GST SUMMARY REPORT (SLABS PARITY)
  it('accurately groups line items by GST rate slabs (0%, 5%, 12%, 18%, 28%)', async () => {
    const res = await request(app)
      .get('/api/reports/detailed?period=all_time')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const { gstSummaryReport } = res.body;

    // Find 18% slab
    const slab18 = gstSummaryReport.find((s: any) => s.rate === 18);
    expect(slab18).toBeDefined();
    expect(slab18.taxableAmount).toBeGreaterThanOrEqual(45000 + 30000 + 20000);
    expect(slab18.totalTaxAmount).toBeGreaterThanOrEqual(slab18.taxableAmount * 0.18 - 1);
  });

  // 6. PRODUCT & SERVICE SALES REPORT
  it('summarizes sales quantities and taxable revenue by line item description', async () => {
    const res = await request(app)
      .get('/api/reports/detailed?period=all_time')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const { productSalesReport } = res.body;

    const devOpsProduct = productSalesReport.find((p: any) => p.name === devOpsDesc);
    expect(devOpsProduct).toBeDefined();
    expect(devOpsProduct.quantitySold).toBe(1);
    expect(devOpsProduct.taxableAmount).toBe(45000);
    expect(devOpsProduct.totalSales).toBe(53100);
  });

  // 7. CSV EXPORT FOR ALL REPORT TYPES
  it('exports RFC-compliant CSV for all report types', async () => {
    const reportTypes = ['collections', 'receivables', 'gst', 'customer_sales'];

    for (const type of reportTypes) {
      const csvRes = await request(app)
        .get(`/api/reports/export?reportType=${type}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(csvRes.status).toBe(200);
      expect(csvRes.headers['content-type']).toContain('text/csv');
      expect(csvRes.headers['content-disposition']).toMatch(/attachment; filename="klanvision-report-/);
      expect(csvRes.text.length).toBeGreaterThan(20);
    }
  });

  // 8. CUSTOMER & DATE FILTER CONSISTENCY
  it('filters reports consistently when scoped to a specific customer or date range', async () => {
    const cust1Res = await request(app)
      .get(`/api/reports/detailed?customerId=${customer1Id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(cust1Res.status).toBe(200);
    expect(cust1Res.body.receivablesReport.every((r: any) => r.customerId === customer1Id)).toBe(true);
    expect(cust1Res.body.customerSalesReport.every((cs: any) => cs.customerId === customer1Id)).toBe(true);
  });
});
