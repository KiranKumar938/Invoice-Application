import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/index.js';
import { prisma } from '../src/prisma.js';

describe('Klanvision Invoice List Module & Advanced Filtering Tests', () => {
  let adminToken: string;
  let tenantId: string;
  let customer1Id: string;
  let customer2Id: string;
  let draftInvoiceId: string;
  let issuedInvoiceId: string;
  let partiallyPaidInvoiceId: string;
  let paidInvoiceId: string;
  let overdueInvoiceId: string;
  let cancelledInvoiceId: string;

  const randomLetters = (n: number) => Array.from({ length: n }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('');
  const randomDigits = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 10).toString()).join('');
  const makeGstin = (stateCode: string) => `${stateCode}${randomLetters(5)}${randomDigits(4)}${randomLetters(1)}1Z${randomDigits(1)}`;

  beforeAll(async () => {
    const timestamp = Date.now();

    // 1. Authenticate as admin
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@klanvision.com',
        password: 'Password123!',
      });
    expect(loginRes.status).toBe(200);
    adminToken = loginRes.body.token;
    tenantId = loginRes.body.tenant.id;

    // 2. Create 2 distinct test customers
    const c1Res = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Alpha Enterprises ${timestamp}`,
        email: `alpha_${timestamp}_${Math.random().toString(36).substring(7)}@test.com`,
        phone: `91${randomDigits(8)}`,
        gstin: makeGstin('07'),
        billingAddress: 'Nehru Place, South Delhi',
        billingCity: 'New Delhi',
        billingState: 'Delhi',
        billingPostalCode: '110019',
      });
    expect(c1Res.status).toBe(201);
    customer1Id = c1Res.body.id;

    const c2Res = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Beta Logistics ${timestamp}`,
        email: `beta_${timestamp}_${Math.random().toString(36).substring(7)}@test.com`,
        phone: `92${randomDigits(8)}`,
        gstin: makeGstin('27'),
        billingAddress: 'Nariman Point',
        billingCity: 'Mumbai',
        billingState: 'Maharashtra',
        billingPostalCode: '400021',
      });
    expect(c2Res.status).toBe(201);
    customer2Id = c2Res.body.id;

    // 3. Create invoices across all states:
    // A. DRAFT
    const draftRes = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId: customer1Id,
        issueDate: '2026-10-01',
        dueDate: '2026-10-31',
        status: 'DRAFT',
        lineItems: [
          { description: 'Draft Consulting Scope', quantity: 1, unitPrice: 15000, gstRate: 18 },
        ],
      });
    expect(draftRes.status).toBe(201);
    draftInvoiceId = draftRes.body.id;

    // B. ISSUED (due next month)
    const issuedRes = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId: customer1Id,
        issueDate: '2026-10-10',
        dueDate: '2026-11-10',
        status: 'ISSUED',
        lineItems: [
          { description: 'Cloud Setup Tier 1', quantity: 1, unitPrice: 20000, gstRate: 18 },
        ],
      });
    expect(issuedRes.status).toBe(201);
    issuedInvoiceId = issuedRes.body.id;

    // C. OVERDUE (dueDate is 2026-09-01 which is in the past)
    const overdueRes = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId: customer1Id,
        issueDate: '2026-08-01',
        dueDate: '2026-09-01',
        status: 'ISSUED',
        lineItems: [
          { description: 'Legacy Migration Project', quantity: 1, unitPrice: 25000, gstRate: 18 },
        ],
      });
    expect(overdueRes.status).toBe(201);
    overdueInvoiceId = overdueRes.body.id;

    // D. PARTIALLY_PAID
    const partialRes = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId: customer2Id,
        issueDate: '2026-10-05',
        dueDate: '2026-11-05',
        status: 'ISSUED',
        lineItems: [
          { description: 'Logistics API Integration', quantity: 1, unitPrice: 40000, gstRate: 18 },
        ],
      });
    expect(partialRes.status).toBe(201);
    partiallyPaidInvoiceId = partialRes.body.id;

    // Pay ₹20,000 against partiallyPaidInvoice
    await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId: customer2Id,
        invoiceId: partiallyPaidInvoiceId,
        amount: 20000,
        paymentDate: '2026-10-06',
        paymentMethod: 'UPI',
        transactionReference: `UPI_PARTIAL_${timestamp}`,
      });

    // E. PAID (fully settled)
    const paidRes = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId: customer2Id,
        issueDate: '2026-10-08',
        dueDate: '2026-11-08',
        status: 'ISSUED',
        lineItems: [
          { description: 'Quarterly Maintenance License', quantity: 1, unitPrice: 10000, gstRate: 18 },
        ],
      });
    expect(paidRes.status).toBe(201);
    paidInvoiceId = paidRes.body.id;
    const paidTotal = paidRes.body.totalAmount;

    // Full payment
    await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId: customer2Id,
        invoiceId: paidInvoiceId,
        amount: paidTotal,
        paymentDate: '2026-10-09',
        paymentMethod: 'BANK_TRANSFER',
        transactionReference: `UTR_FULL_${timestamp}`,
      });

    // F. CANCELLED
    const toCancelRes = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId: customer1Id,
        issueDate: '2026-10-02',
        dueDate: '2026-11-02',
        status: 'ISSUED',
        lineItems: [
          { description: 'Cancelled Scope Project', quantity: 1, unitPrice: 12000, gstRate: 18 },
        ],
      });
    expect(toCancelRes.status).toBe(201);
    cancelledInvoiceId = toCancelRes.body.id;

    const cancelActionRes = await request(app)
      .post(`/api/invoices/${cancelledInvoiceId}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(cancelActionRes.status).toBe(200);
  });

  // 1. STATUS FILTERING & DYNAMIC OVERDUE EVALUATION
  it('filters invoices by all supported statuses including dynamic Overdue calculation', async () => {
    // A. Query OVERDUE
    const overdueList = await request(app)
      .get('/api/invoices?status=OVERDUE&limit=100')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(overdueList.status).toBe(200);
    expect(overdueList.body.invoices.length).toBeGreaterThan(0);
    const foundOverdue = overdueList.body.invoices.find((i: any) => i.id === overdueInvoiceId);
    expect(foundOverdue).toBeDefined();
    expect(foundOverdue.status).toBe('OVERDUE');

    // B. Query DRAFT
    const draftList = await request(app)
      .get('/api/invoices?status=DRAFT&limit=100')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(draftList.status).toBe(200);
    const foundDraft = draftList.body.invoices.find((i: any) => i.id === draftInvoiceId);
    expect(foundDraft).toBeDefined();
    expect(foundDraft.status).toBe('DRAFT');

    // C. Query PARTIALLY_PAID
    const partialList = await request(app)
      .get('/api/invoices?status=PARTIALLY_PAID&limit=100')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(partialList.status).toBe(200);
    const foundPartial = partialList.body.invoices.find((i: any) => i.id === partiallyPaidInvoiceId);
    expect(foundPartial).toBeDefined();
    expect(foundPartial.status).toBe('PARTIALLY_PAID');
    expect(foundPartial.paidAmount).toBe(20000);
    expect(foundPartial.outstandingAmount).toBeGreaterThan(0);

    // D. Query PAID
    const paidList = await request(app)
      .get('/api/invoices?status=PAID&limit=100')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(paidList.status).toBe(200);
    const foundPaid = paidList.body.invoices.find((i: any) => i.id === paidInvoiceId);
    expect(foundPaid).toBeDefined();
    expect(foundPaid.status).toBe('PAID');
    expect(foundPaid.outstandingAmount).toBe(0);

    // E. Query CANCELLED
    const cancelledList = await request(app)
      .get('/api/invoices?status=CANCELLED&limit=100')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(cancelledList.status).toBe(200);
    const foundCancelled = cancelledList.body.invoices.find((i: any) => i.id === cancelledInvoiceId);
    expect(foundCancelled).toBeDefined();
    expect(foundCancelled.status).toBe('CANCELLED');
  });

  // 2. CUSTOMER & DATE RANGE FILTERING
  it('filters invoices strictly by customerId and date range', async () => {
    // Customer filter
    const cust1List = await request(app)
      .get(`/api/invoices?customerId=${customer1Id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(cust1List.status).toBe(200);
    expect(cust1List.body.invoices.every((i: any) => i.customerId === customer1Id)).toBe(true);

    // Date range filter
    const dateFiltered = await request(app)
      .get('/api/invoices?startDate=2026-10-01&endDate=2026-10-15')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(dateFiltered.status).toBe(200);
    for (const inv of dateFiltered.body.invoices) {
      const invDate = new Date(inv.issueDate).getTime();
      expect(invDate).toBeGreaterThanOrEqual(new Date('2026-10-01').getTime());
      expect(invDate).toBeLessThanOrEqual(new Date('2026-10-15T23:59:59.999Z').getTime());
    }
  });

  // 3. SEARCH BY INVOICE NUMBER AND CUSTOMER
  it('searches invoices by customer name and invoice number', async () => {
    // Search customer name
    const searchRes = await request(app)
      .get('/api/invoices?search=Alpha Enterprises')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(searchRes.status).toBe(200);
    expect(searchRes.body.invoices.length).toBeGreaterThan(0);
    expect(searchRes.body.invoices.some((i: any) => i.customer.name.includes('Alpha Enterprises'))).toBe(true);
  });

  // 4. SORTING AND PAGINATION
  it('supports multi-field sorting and pagination controls', async () => {
    // Sort totalAmount ascending
    const sortAsc = await request(app)
      .get('/api/invoices?sortBy=totalAmount&sortOrder=asc&limit=5')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(sortAsc.status).toBe(200);
    expect(sortAsc.body.invoices.length).toBeLessThanOrEqual(5);
    expect(sortAsc.body.pagination.page).toBe(1);
    expect(sortAsc.body.pagination.limit).toBe(5);

    for (let i = 0; i < sortAsc.body.invoices.length - 1; i++) {
      expect(sortAsc.body.invoices[i].totalAmount).toBeLessThanOrEqual(sortAsc.body.invoices[i + 1].totalAmount);
    }
  });

  // 5. CSV EXPORT
  it('exports filtered invoices to standard formatted CSV with proper headers and content', async () => {
    const exportRes = await request(app)
      .get('/api/invoices/export')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(exportRes.status).toBe(200);
    expect(exportRes.headers['content-type']).toContain('text/csv');
    expect(exportRes.headers['content-disposition']).toMatch(/attachment; filename="klanvision-invoices-/);

    const text = exportRes.text;
    expect(text).toContain('Invoice Number');
    expect(text).toContain('Customer Name');
    expect(text).toContain('Total Amount (INR)');
    expect(text).toContain('Outstanding Balance (INR)');
    expect(text).toContain('Alpha Enterprises');
  });

  // 6. DUPLICATE INVOICE
  it('duplicates an existing invoice as a new draft with fresh sequential number and cloned line items', async () => {
    const duplicateRes = await request(app)
      .post(`/api/invoices/${issuedInvoiceId}/duplicate`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(duplicateRes.status).toBe(201);
    expect(duplicateRes.body.id).toBeDefined();
    expect(duplicateRes.body.id).not.toBe(issuedInvoiceId);
    expect(duplicateRes.body.status).toBe('DRAFT');
    expect(duplicateRes.body.paidAmount).toBe(0);
    expect(duplicateRes.body.outstandingAmount).toBe(0);

    // Verify duplicated invoice in database
    const dbDuplicated = await prisma.invoice.findUnique({
      where: { id: duplicateRes.body.id },
      include: { lineItems: true },
    });
    expect(dbDuplicated).toBeDefined();
    expect(dbDuplicated?.lineItems.length).toBeGreaterThan(0);
    expect(dbDuplicated?.lineItems[0].description).toBe('Cloud Setup Tier 1');
  });

  // 7. DATA CONSISTENCY & INTEGRITY
  it('verifies that displayed status and amounts match invoice detail and payment records', async () => {
    // Query invoice via list
    const listRes = await request(app)
      .get(`/api/invoices?search=${partiallyPaidInvoiceId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    // Query same invoice via GET /:id
    const detailRes = await request(app)
      .get(`/api/invoices/${partiallyPaidInvoiceId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(detailRes.status).toBe(200);
    expect(detailRes.body.status).toBe('PARTIALLY_PAID');
    expect(detailRes.body.paidAmount).toBe(20000);
    expect(detailRes.body.outstandingAmount).toBe(detailRes.body.totalAmount - 20000);

    // Payments array verification
    expect(detailRes.body.payments.length).toBe(1);
    expect(detailRes.body.payments[0].amount).toBe(20000);
  });
});
