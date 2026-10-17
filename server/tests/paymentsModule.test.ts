import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/index.js';
import { prisma } from '../src/prisma.js';

describe('Klanvision Payments Module Tests', () => {
  let adminToken: string;
  let tenantId: string;
  let customerId: string;
  let invoice1Id: string;
  let invoice2Id: string;

  const randomLetters = (n: number) =>
    Array.from({ length: n }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('');
  const randomDigits = (n: number) =>
    Array.from({ length: n }, () => Math.floor(Math.random() * 10).toString()).join('');
  const makeGstin = (stateCode: string) =>
    `${stateCode}${randomLetters(5)}${randomDigits(4)}${randomLetters(1)}1Z${randomDigits(1)}`;

  beforeAll(async () => {
    const timestamp = Date.now();

    // 1. Authenticate as Admin
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'admin@klanvision.com',
      password: 'Password123!',
    });
    expect(loginRes.status).toBe(200);
    adminToken = loginRes.body.token;
    tenantId = loginRes.body.tenant.id;

    // 2. Create customer
    const custRes = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Payment Test Client ${timestamp}`,
        email: `paytest_${timestamp}_${Math.random().toString(36).substring(7)}@test.com`,
        phone: `94${randomDigits(8)}`,
        gstin: makeGstin('07'),
        billingAddress: 'Block C, Connaught Place',
        billingCity: 'New Delhi',
        billingState: 'Delhi',
        billingPostalCode: '110001',
      });
    expect(custRes.status).toBe(201);
    customerId = custRes.body.id;

    // 3. Create Invoice 1 (₹20,000 + 18% GST = ₹23,600)
    const inv1Res = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId,
        issueDate: '2026-10-10',
        dueDate: '2026-11-10',
        status: 'ISSUED',
        lineItems: [
          { description: 'Cloud API Subscription', quantity: 1, unitPrice: 20000, gstRate: 18 },
        ],
      });
    expect(inv1Res.status).toBe(201);
    invoice1Id = inv1Res.body.id;

    // 4. Create Invoice 2 (₹10,000 + 18% GST = ₹11,800)
    const inv2Res = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId,
        issueDate: '2026-10-12',
        dueDate: '2026-11-12',
        status: 'ISSUED',
        lineItems: [
          { description: 'Security Audit & Setup', quantity: 1, unitPrice: 10000, gstRate: 18 },
        ],
      });
    expect(inv2Res.status).toBe(201);
    invoice2Id = inv2Res.body.id;
  });

  // 1. PARTIAL PAYMENT & OUTSTANDING BALANCE
  it('records a partial payment, updates invoice paid amount, outstanding balance, and transitions status to PARTIALLY_PAID', async () => {
    const partialAmount = 10000;
    const res = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId,
        invoiceId: invoice1Id,
        amount: partialAmount,
        paymentDate: '2026-10-13',
        paymentMethod: 'UPI',
        transactionReference: `UPI_PARTIAL_${Date.now()}`,
        notes: 'Partial milestone settlement via Google Pay',
      });

    expect(res.status).toBe(201);
    expect(res.body.paymentNumber).toMatch(/^PMT-\d{4}-\d{4}$/);
    expect(res.body.status).toBe('SUCCESS');
    expect(res.body.amount).toBe(partialAmount);

    // Verify invoice state
    const inv = await prisma.invoice.findUnique({ where: { id: invoice1Id } });
    expect(inv).toBeDefined();
    expect(inv!.paidAmount).toBe(10000);
    expect(inv!.outstandingAmount).toBe(13600); // 23600 - 10000
    expect(inv!.status).toBe('PARTIALLY_PAID');
    expect(inv!.paymentStatus).toBe('PARTIALLY_PAID');

    // Verify allocation record
    const allocation = await prisma.paymentAllocation.findFirst({
      where: { paymentId: res.body.id },
    });
    expect(allocation).toBeDefined();
    expect(allocation!.invoiceId).toBe(invoice1Id);
    expect(allocation!.amount).toBe(10000);
  });

  // 2. FULL PAYMENT & SETTLEMENT
  it('records the remaining payment on the invoice and transitions status to PAID with zero balance', async () => {
    const remainingAmount = 13600;
    const res = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId,
        invoiceId: invoice1Id,
        amount: remainingAmount,
        paymentDate: '2026-10-14',
        paymentMethod: 'BANK_TRANSFER',
        transactionReference: `NEFT_FINAL_${Date.now()}`,
        notes: 'Final balance clearance via HDFC NetBanking',
      });

    expect(res.status).toBe(201);

    // Verify invoice is fully settled
    const inv = await prisma.invoice.findUnique({ where: { id: invoice1Id } });
    expect(inv).toBeDefined();
    expect(inv!.paidAmount).toBe(23600);
    expect(inv!.outstandingAmount).toBe(0);
    expect(inv!.status).toBe('PAID');
    expect(inv!.paymentStatus).toBe('PAID');
  });

  // 3. PREVENT ALLOCATION EXCEEDING REMAINING BALANCE
  it('prevents allocations that exceed an invoices remaining balance', async () => {
    // invoice2 has total 11800, outstanding 11800
    const res = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId,
        invoiceId: invoice2Id,
        amount: 25000, // exceeds 11800
        paymentDate: '2026-10-15',
        paymentMethod: 'CASH',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('exceeds the remaining balance');

    // Verify invoice remains untouched
    const inv = await prisma.invoice.findUnique({ where: { id: invoice2Id } });
    expect(inv!.outstandingAmount).toBe(11800);
    expect(inv!.paidAmount).toBe(0);
  });

  // 4. MULTI-INVOICE ALLOCATIONS
  it('supports multi-invoice allocations in a single payment and validates total against payment amount', async () => {
    // Create two fresh invoices
    const invA = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId,
        issueDate: '2026-10-14',
        dueDate: '2026-11-14',
        status: 'ISSUED',
        lineItems: [{ description: 'Feature A', quantity: 1, unitPrice: 5000, gstRate: 18 }],
      });
    const invB = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId,
        issueDate: '2026-10-14',
        dueDate: '2026-11-14',
        status: 'ISSUED',
        lineItems: [{ description: 'Feature B', quantity: 1, unitPrice: 8000, gstRate: 18 }],
      });

    const invATotal = invA.body.totalAmount; // 5900
    const invBTotal = invB.body.totalAmount; // 9440

    // Single payment of ₹15,340 covering both invoices
    const multiRes = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId,
        amount: 15340,
        paymentDate: '2026-10-15',
        paymentMethod: 'BANK_TRANSFER',
        transactionReference: `RTGS_MULTI_${Date.now()}`,
        allocations: [
          { invoiceId: invA.body.id, amount: invATotal },
          { invoiceId: invB.body.id, amount: invBTotal },
        ],
      });

    expect(multiRes.status).toBe(201);

    // Verify both invoices are settled
    const updatedA = await prisma.invoice.findUnique({ where: { id: invA.body.id } });
    const updatedB = await prisma.invoice.findUnique({ where: { id: invB.body.id } });
    expect(updatedA!.outstandingAmount).toBe(0);
    expect(updatedA!.status).toBe('PAID');
    expect(updatedB!.outstandingAmount).toBe(0);
    expect(updatedB!.status).toBe('PAID');
  });

  // 5. IDEMPOTENCY & DUPLICATE PROTECTION
  it('detects and prevents duplicate payment submission with identical transaction reference within time window', async () => {
    const utr = `UTR_IDEMP_${Date.now()}`;
    const pmtPayload = {
      customerId,
      invoiceId: invoice2Id,
      amount: 5000,
      paymentDate: '2026-10-15',
      paymentMethod: 'UPI' as const,
      transactionReference: utr,
    };

    // First request succeeds
    const firstRes = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(pmtPayload);
    expect(firstRes.status).toBe(201);

    // Second repeated request with identical UTR is rejected with 409 Conflict
    const secondRes = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(pmtPayload);

    expect(secondRes.status).toBe(409);
    expect(secondRes.body.error).toContain('Duplicate payment detected');
  });

  // 6. CONTROLLED REVERSAL / REFUND WORKFLOW
  it('executes a controlled reversal, preserves audit trail without silent deletion, and restores balances', async () => {
    // Record payment of ₹4,000 on invoice2 (leaving 11800 - 5000 - 4000 = 2800)
    const pmtRes = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId,
        invoiceId: invoice2Id,
        amount: 4000,
        paymentDate: '2026-10-15',
        paymentMethod: 'CASH',
        transactionReference: `CASH_REV_${Date.now()}`,
      });
    expect(pmtRes.status).toBe(201);
    const paymentId = pmtRes.body.id;

    // Check balances before reversal
    const invBefore = await prisma.invoice.findUnique({ where: { id: invoice2Id } });
    expect(invBefore!.paidAmount).toBe(9000); // 5000 from test 5 + 4000
    expect(invBefore!.outstandingAmount).toBe(2800);

    // Reverse the payment
    const reverseRes = await request(app)
      .post(`/api/payments/${paymentId}/reverse`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Customer accidentally paid cash twice' });

    expect(reverseRes.status).toBe(200);
    expect(reverseRes.body.payment.status).toBe('REVERSED');
    expect(reverseRes.body.payment.notes).toContain('REVERSED on');

    // Verify invoice balances were restored cleanly
    const invAfter = await prisma.invoice.findUnique({ where: { id: invoice2Id } });
    expect(invAfter!.paidAmount).toBe(5000); // restored back by 4000
    expect(invAfter!.outstandingAmount).toBe(6800); // 2800 + 4000

    // Ensure payment record was NOT deleted
    const pmtDb = await prisma.payment.findUnique({ where: { id: paymentId } });
    expect(pmtDb).toBeDefined();
    expect(pmtDb!.status).toBe('REVERSED');

    // Attempting to reverse an already reversed payment fails
    const doubleRevRes = await request(app)
      .post(`/api/payments/${paymentId}/reverse`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Try again' });
    expect(doubleRevRes.status).toBe(400);
    expect(doubleRevRes.body.error).toContain('already been reversed');
  });

  // 7. CSV EXPORT & VECTOR RECEIPT PDF
  it('exports payments to CSV and generates a valid vector receipt PDF', async () => {
    // CSV Export
    const csvRes = await request(app)
      .get('/api/payments/export')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(csvRes.status).toBe(200);
    expect(csvRes.headers['content-type']).toContain('text/csv');
    expect(csvRes.text).toContain('Payment Number');
    expect(csvRes.text).toContain('Customer Name');
    expect(csvRes.text).toContain('Amount (INR)');
    expect(csvRes.text).toContain('PMT-');

    // Fetch any payment to test receipt
    const listRes = await request(app)
      .get('/api/payments?limit=1')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(listRes.body.payments.length).toBeGreaterThan(0);
    const pmtId = listRes.body.payments[0].id;

    // Vector Receipt PDF
    const receiptRes = await request(app)
      .get(`/api/payments/${pmtId}/receipt`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(receiptRes.status).toBe(200);
    expect(receiptRes.headers['content-type']).toBe('application/pdf');
    expect(receiptRes.headers['content-disposition']).toMatch(/RECEIPT-PMT-/);
    expect(receiptRes.body.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });
});
