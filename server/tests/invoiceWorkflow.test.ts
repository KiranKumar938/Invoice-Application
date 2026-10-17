import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/index.js';
import { prisma } from '../src/prisma.js';

describe('Create Invoice Workflow & Business Rules Tests', () => {
  let adminToken: string;
  let tenantId: string;
  let delhiCustomerId: string;
  let mumbaiCustomerId: string;

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

    // 2. Create Intra-state customer (Delhi)
    const delhiCustRes = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Delhi Intra Client ${timestamp}`,
        email: `delhi_${timestamp}_${Math.random().toString(36).substring(7)}@test.com`,
        phone: `98${randomDigits(8)}`,
        gstin: makeGstin('07'),
        billingAddress: 'Connaught Place, Central Delhi',
        billingCity: 'New Delhi',
        billingState: 'Delhi',
        billingPostalCode: '110001',
      });
    expect(delhiCustRes.status).toBe(201);
    delhiCustomerId = delhiCustRes.body.id;

    // 3. Create Inter-state customer (Maharashtra)
    const mumbaiCustRes = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Mumbai Inter Client ${timestamp}`,
        email: `mumbai_${timestamp}_${Math.random().toString(36).substring(7)}@test.com`,
        phone: `99${randomDigits(8)}`,
        gstin: makeGstin('27'),
        billingAddress: 'BKC, Bandra East',
        billingCity: 'Mumbai',
        billingState: 'Maharashtra',
        billingPostalCode: '400051',
      });
    expect(mumbaiCustRes.status).toBe(201);
    mumbaiCustomerId = mumbaiCustRes.body.id;
  });

  // 1. CALCULATIONS & DECIMAL-SAFE ARITHMETIC
  it('calculates decimal-safe financials with item discounts, tax breakdown, and round-off', async () => {
    const payload = {
      customerId: delhiCustomerId,
      issueDate: '2026-10-16',
      dueDate: '2026-11-15',
      status: 'ISSUED',
      lineItems: [
        {
          description: 'Enterprise Cloud Server Instance',
          hsnSacCode: '998313',
          quantity: 2.5,
          unitPrice: 10000, // Gross: 25,000
          discountPercent: 10, // Disc: 2,500 -> Taxable: 22,500
          gstRate: 18, // 18% of 22,500 = 4,050 (CGST 2,025 + SGST 2,025)
        },
        {
          description: 'Security Audit & Compliance Pack',
          hsnSacCode: '998314',
          quantity: 1,
          unitPrice: 12450.45,
          discountPercent: 0,
          gstRate: 18, // 18% of 12450.45 = 2241.08
        },
      ],
    };

    const res = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.subtotal).toBe(37450.45);
    expect(res.body.discountTotal).toBe(2500);
    expect(res.body.taxableAmount).toBe(34950.45);
    // CGST + SGST applied because Intra-state (Delhi -> Delhi)
    expect(res.body.isInterState).toBe(false);
    expect(res.body.igstTotal).toBe(0);
    expect(res.body.cgstTotal).toBeGreaterThan(0);
    expect(res.body.sgstTotal).toBe(res.body.cgstTotal);
    expect(res.body.totalAmount).toBe(Math.round(34950.45 + res.body.taxTotal));
  });

  // 2. EMPTY LINE ITEMS VALIDATION
  it('rejects invoice creation with empty line items array', async () => {
    const payload = {
      customerId: delhiCustomerId,
      issueDate: '2026-10-16',
      dueDate: '2026-11-15',
      lineItems: [],
    };

    const res = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/At least one line item is required/i);
  });

  it('rejects line item with empty description or non-positive quantity', async () => {
    const invalidPayload = {
      customerId: delhiCustomerId,
      issueDate: '2026-10-16',
      dueDate: '2026-11-15',
      lineItems: [
        {
          description: '',
          quantity: 1,
          unitPrice: 1000,
        },
      ],
    };

    const res = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(invalidPayload);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/description is required/i);

    const invalidQtyPayload = {
      customerId: delhiCustomerId,
      issueDate: '2026-10-16',
      dueDate: '2026-11-15',
      lineItems: [
        {
          description: 'Valid Item',
          quantity: 0,
          unitPrice: 1000,
        },
      ],
    };

    const resQty = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(invalidQtyPayload);

    expect(resQty.status).toBe(400);
    expect(resQty.body.error).toMatch(/greater than zero/i);
  });

  // 3. INVALID DATES VALIDATION
  it('rejects invoice when due date is earlier than issue date', async () => {
    const payload = {
      customerId: delhiCustomerId,
      issueDate: '2026-10-20',
      dueDate: '2026-10-10', // 10 days before issue date
      lineItems: [
        {
          description: 'Software License',
          quantity: 1,
          unitPrice: 5000,
          gstRate: 18,
        },
      ],
    };

    const res = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Due date cannot be earlier than invoice issue date/i);
  });

  // 4. DISCOUNTS VALIDATION
  it('validates discount boundaries (rejects negative and > 100%)', async () => {
    const negativeDisc = {
      customerId: delhiCustomerId,
      issueDate: '2026-10-16',
      dueDate: '2026-11-16',
      lineItems: [
        {
          description: 'Consulting',
          quantity: 1,
          unitPrice: 5000,
          discountPercent: -5,
          gstRate: 18,
        },
      ],
    };

    const res1 = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(negativeDisc);
    expect(res1.status).toBe(400);
    expect(res1.body.error).toMatch(/Discount cannot be negative/i);

    const overDisc = {
      customerId: delhiCustomerId,
      issueDate: '2026-10-16',
      dueDate: '2026-11-16',
      lineItems: [
        {
          description: 'Consulting',
          quantity: 1,
          unitPrice: 5000,
          discountPercent: 120,
          gstRate: 18,
        },
      ],
    };

    const res2 = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(overDisc);
    expect(res2.status).toBe(400);
    expect(res2.body.error).toMatch(/Discount cannot exceed 100%/i);
  });

  // 5. GST CASES & PLACE OF SUPPLY
  it('applies CGST and SGST for Intra-State supply (Delhi to Delhi)', async () => {
    const res = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId: delhiCustomerId,
        issueDate: '2026-10-16',
        dueDate: '2026-11-16',
        lineItems: [
          {
            description: 'Delhi Local Web Hosting',
            quantity: 1,
            unitPrice: 10000,
            discountPercent: 0,
            gstRate: 18,
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.isInterState).toBe(false);
    expect(res.body.cgstTotal).toBe(900); // 9% of 10,000
    expect(res.body.sgstTotal).toBe(900); // 9% of 10,000
    expect(res.body.igstTotal).toBe(0);
    expect(res.body.taxTotal).toBe(1800);
    expect(res.body.totalAmount).toBe(11800);
  });

  it('applies IGST for Inter-State supply (Delhi to Maharashtra)', async () => {
    const res = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId: mumbaiCustomerId,
        issueDate: '2026-10-16',
        dueDate: '2026-11-16',
        lineItems: [
          {
            description: 'Mumbai Branch Cloud Infrastructure',
            quantity: 1,
            unitPrice: 10000,
            discountPercent: 0,
            gstRate: 18,
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.isInterState).toBe(true);
    expect(res.body.igstTotal).toBe(1800); // 18% IGST
    expect(res.body.cgstTotal).toBe(0);
    expect(res.body.sgstTotal).toBe(0);
    expect(res.body.taxTotal).toBe(1800);
    expect(res.body.totalAmount).toBe(11800);
  });

  it('honors custom placeOfSupply override', async () => {
    // Delhi customer, but placeOfSupply explicitly given as Karnataka -> Inter-State!
    const res = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId: delhiCustomerId,
        placeOfSupply: 'Karnataka',
        issueDate: '2026-10-16',
        dueDate: '2026-11-16',
        lineItems: [
          {
            description: 'Bangalore Remote Deployment Service',
            quantity: 1,
            unitPrice: 20000,
            gstRate: 18,
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.isInterState).toBe(true);
    expect(res.body.igstTotal).toBe(3600);
    expect(res.body.cgstTotal).toBe(0);
  });

  // 6. DRAFT VS ISSUED INVOICE LIFECYCLE & CONTROLLED AMENDMENT
  it('supports full Draft lifecycle: save draft without customer balance increment, edit draft, then issue', async () => {
    // Check initial customer balance
    const custBefore = await prisma.customer.findUnique({ where: { id: delhiCustomerId } });
    const initialOutstanding = custBefore?.currentOutstanding || 0;

    // 1. Save as Draft
    const draftRes = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId: delhiCustomerId,
        issueDate: '2026-10-16',
        dueDate: '2026-11-16',
        status: 'DRAFT',
        lineItems: [
          {
            description: 'Draft Item Initial',
            quantity: 1,
            unitPrice: 5000,
            gstRate: 18,
          },
        ],
      });

    expect(draftRes.status).toBe(201);
    expect(draftRes.body.status).toBe('DRAFT');
    const draftId = draftRes.body.id;

    // Customer balance should NOT have changed for DRAFT
    const custAfterDraft = await prisma.customer.findUnique({ where: { id: delhiCustomerId } });
    expect(custAfterDraft?.currentOutstanding).toBe(initialOutstanding);

    // 2. Edit Draft
    const editDraftRes = await request(app)
      .put(`/api/invoices/${draftId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId: delhiCustomerId,
        issueDate: '2026-10-16',
        dueDate: '2026-11-16',
        status: 'DRAFT',
        lineItems: [
          {
            description: 'Draft Item Modified and Expanded',
            quantity: 2,
            unitPrice: 8000,
            discountPercent: 10,
            gstRate: 18,
          },
        ],
      });

    expect(editDraftRes.status).toBe(200);
    expect(editDraftRes.body.status).toBe('DRAFT');
    expect(editDraftRes.body.subtotal).toBe(16000);

    // 3. Issue the Draft
    const issueDraftRes = await request(app)
      .put(`/api/invoices/${draftId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId: delhiCustomerId,
        issueDate: '2026-10-16',
        dueDate: '2026-11-16',
        status: 'ISSUED',
        lineItems: [
          {
            description: 'Final Issued Scope',
            quantity: 1,
            unitPrice: 10000,
            discountPercent: 0,
            gstRate: 18,
          },
        ],
      });

    expect(issueDraftRes.status).toBe(200);
    expect(issueDraftRes.body.status).toBe('ISSUED');
    expect(issueDraftRes.body.totalAmount).toBe(11800);

    // Customer balance should now be incremented by 11,800
    const custAfterIssue = await prisma.customer.findUnique({ where: { id: delhiCustomerId } });
    expect(custAfterIssue?.currentOutstanding).toBe(initialOutstanding + 11800);
  });

  // 7. CONTROLLED AMENDMENT OF ISSUED INVOICE
  it('controls amendment of issued invoice and prevents amending cancelled invoices', async () => {
    // 1. Create an issued invoice
    const invRes = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId: delhiCustomerId,
        issueDate: '2026-10-16',
        dueDate: '2026-11-16',
        status: 'ISSUED',
        lineItems: [
          {
            description: 'Amendment Test Base Item',
            quantity: 1,
            unitPrice: 10000,
            gstRate: 18,
          },
        ],
      });
    const invId = invRes.body.id;

    // 2. Amend it (e.g. add additional scope of 5,000)
    const amendRes = await request(app)
      .put(`/api/invoices/${invId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId: delhiCustomerId,
        issueDate: '2026-10-16',
        dueDate: '2026-11-16',
        status: 'ISSUED',
        lineItems: [
          {
            description: 'Amendment Test Base Item',
            quantity: 1,
            unitPrice: 15000,
            gstRate: 18,
          },
        ],
      });
    expect(amendRes.status).toBe(200);
    expect(amendRes.body.totalAmount).toBe(17700);

    // 3. Cancel the invoice
    const cancelRes = await request(app)
      .post(`/api/invoices/${invId}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(cancelRes.status).toBe(200);

    // 4. Try to amend the cancelled invoice -> must be rejected!
    const tryAmendCancelled = await request(app)
      .put(`/api/invoices/${invId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId: delhiCustomerId,
        issueDate: '2026-10-16',
        dueDate: '2026-11-16',
        status: 'ISSUED',
        lineItems: [
          {
            description: 'Illegal edit on cancelled invoice',
            quantity: 1,
            unitPrice: 1000,
            gstRate: 18,
          },
        ],
      });
    expect(tryAmendCancelled.status).toBe(400);
    expect(tryAmendCancelled.body.error).toMatch(/Cancelled invoices cannot be modified/i);
  });

  // 8. REPEATED SUBMISSIONS
  it('handles repeated invoice creation submissions gracefully with unique numbers', async () => {
    const payload = {
      customerId: delhiCustomerId,
      issueDate: '2026-10-16',
      dueDate: '2026-11-16',
      status: 'ISSUED',
      lineItems: [
        {
          description: 'Repeated Submission Service',
          quantity: 1,
          unitPrice: 2500,
          gstRate: 18,
        },
      ],
    };

    const res1 = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload);

    const res2 = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload);

    expect(res1.status).toBe(201);
    expect(res2.status).toBe(201);
    expect(res1.body.id).not.toBe(res2.body.id);
    expect(res1.body.invoiceNumber).not.toBe(res2.body.invoiceNumber);
  });

  // 9. CONCURRENT INVOICE CREATION
  it('safely handles concurrent invoice creation requests allocating consecutive collision-free numbers', async () => {
    const concurrentRequests = Array.from({ length: 5 }).map((_, index) =>
      request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerId: delhiCustomerId,
          issueDate: '2026-10-16',
          dueDate: '2026-11-16',
          status: 'ISSUED',
          lineItems: [
            {
              description: `Concurrent Worker Task #${index + 1}`,
              quantity: 1,
              unitPrice: 3000,
              gstRate: 18,
            },
          ],
        })
    );

    const responses = await Promise.all(concurrentRequests);

    // All must succeed with 201
    for (const res of responses) {
      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.invoiceNumber).toBeDefined();
    }

    // Every allocated invoice number must be unique!
    const invoiceNumbers = responses.map((r) => r.body.invoiceNumber);
    const uniqueNumbers = new Set(invoiceNumbers);
    expect(uniqueNumbers.size).toBe(5);
  });
});
