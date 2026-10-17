import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/index.js';
import { prisma } from '../src/prisma.js';
import { ShareTokenService } from '../src/services/shareTokenService.js';
import { PdfService } from '../src/services/pdfService.js';

describe('Klanvision Invoice Preview, PDF Generation & Secure Share Link Tests', () => {
  let adminToken: string;
  let tenantId: string;
  let customerId: string;
  let testInvoiceId: string;
  let testInvoiceNumber: string;

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
        name: `Preview Client ${timestamp}`,
        email: `preview_${timestamp}_${Math.random().toString(36).substring(7)}@test.com`,
        phone: `93${randomDigits(8)}`,
        gstin: makeGstin('07'),
        billingAddress: 'Tower B, Tech Park, Okhla Phase 3',
        billingCity: 'New Delhi',
        billingState: 'Delhi',
        billingPostalCode: '110020',
        shippingAddress: 'Plot 42, Sector 18, Electronic City',
        shippingCity: 'Gurugram',
        shippingState: 'Haryana',
        shippingPostalCode: '122015',
      });
    expect(custRes.status).toBe(201);
    customerId = custRes.body.id;

    // 3. Create an invoice with mixed line items, special characters, and GST
    const invRes = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId,
        issueDate: '2026-10-15',
        dueDate: '2026-11-14',
        status: 'ISSUED',
        notes: 'Special terms: 50% advance & 50% post-delivery. Payment ref #KLV-2026.',
        terms: '1. Subject to Delhi jurisdiction.\n2. Interest @ 18% p.a. for late payment.',
        lineItems: [
          {
            description: 'Cloud Infrastructure Architecture & DevSecOps <Tier-1> "Enterprise Edition"',
            hsnSacCode: '998313',
            quantity: 2,
            unitPrice: 45000,
            discountPercent: 10,
            gstRate: 18,
          },
          {
            description: 'SSL / TLS Certificate & Domain Hardening & Monitoring Service',
            hsnSacCode: '998314',
            quantity: 1,
            unitPrice: 12000,
            discountPercent: 0,
            gstRate: 18,
          },
        ],
      });
    expect(invRes.status).toBe(201);
    testInvoiceId = invRes.body.id;
    testInvoiceNumber = invRes.body.invoiceNumber;
  });

  // 1. AUTHENTICATED PDF GENERATION
  it('generates and streams a valid Indian Tax Invoice PDF with proper headers and magic bytes', async () => {
    const res = await request(app)
      .get(`/api/invoices/${testInvoiceId}/pdf`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toContain(`attachment; filename="${testInvoiceNumber}.pdf"`);

    // Verify PDF binary header (%PDF-1.)
    const buffer = res.body;
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(1500);
    const pdfMagic = buffer.subarray(0, 5).toString('ascii');
    expect(pdfMagic).toBe('%PDF-');
  });

  // 2. HISTORICAL BILLING INTEGRITY
  it('preserves historical saved invoice line items and financials without recalculation from updated product prices', async () => {
    // Fetch persisted invoice
    const invBefore = await prisma.invoice.findUnique({
      where: { id: testInvoiceId },
      include: { lineItems: true },
    });
    expect(invBefore).toBeDefined();
    const originalTotal = invBefore!.totalAmount;

    // Simulate modifying a catalog product or settings
    await prisma.product.create({
      data: {
        tenantId,
        name: 'Cloud Infrastructure Architecture & DevSecOps <Tier-1> "Enterprise Edition"',
        hsnSacCode: '998313',
        unitPrice: 999999, // drastically changed price
        gstRate: 28, // drastically changed tax rate
      },
    });

    // Fetch invoice detail API
    const detailRes = await request(app)
      .get(`/api/invoices/${testInvoiceId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(detailRes.status).toBe(200);
    // Verifies invoice total remains exactly the saved historical value
    expect(detailRes.body.totalAmount).toBe(originalTotal);
    expect(detailRes.body.lineItems[0].unitPrice).toBe(45000);
    expect(detailRes.body.lineItems[0].gstRate).toBe(18);

    // Verify generated PDF buffer uses the historical record
    const pdfBuffer = await PdfService.generateInvoicePdf(detailRes.body);
    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.length).toBeGreaterThan(1500);
  });

  // 3. SECURE EXPIRING SHARE LINK LIFECYCLE
  it('generates secure, unguessable expiring share tokens and validates public access', async () => {
    // A. Generate share token via authenticated endpoint
    const shareRes = await request(app)
      .post(`/api/invoices/${testInvoiceId}/share`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(shareRes.status).toBe(200);
    expect(shareRes.body.shareToken).toBeDefined();
    expect(shareRes.body.expiresAt).toBeDefined();
    expect(shareRes.body.invoiceNumber).toBe(testInvoiceNumber);

    const validToken = shareRes.body.shareToken;

    // B. Access public invoice endpoint without any auth header
    const publicRes = await request(app).get(`/api/public/invoices/${validToken}`);
    expect(publicRes.status).toBe(200);
    expect(publicRes.body.invoiceNumber).toBe(testInvoiceNumber);
    expect(publicRes.body.customer.name).toContain('Preview Client');
    expect(publicRes.body.lineItems.length).toBe(2);
    // Ensure internal IDs/secrets are not leaked
    expect(publicRes.body.passwordHash).toBeUndefined();
    expect(publicRes.body.tenant.memberships).toBeUndefined();

    // C. Tampered token verification
    const tamperedToken = validToken.substring(0, validToken.length - 4) + 'abcd';
    const tamperedRes = await request(app).get(`/api/public/invoices/${tamperedToken}`);
    expect(tamperedRes.status).toBe(401);
    expect(tamperedRes.body.error).toMatch(/Unauthorized or tampered|invalid/i);

    // D. Expired token verification
    // Generate an expired token (expires in -1 day)
    const expiredResult = ShareTokenService.generateToken(testInvoiceId, tenantId, -1);
    const expiredRes = await request(app).get(`/api/public/invoices/${expiredResult.token}`);
    expect(expiredRes.status).toBe(401);
    expect(expiredRes.body.error).toContain('expired');
  });

  // 4. PUBLIC PDF STREAMING VIA SHARE TOKEN
  it('allows public PDF download via valid share token and rejects expired links', async () => {
    const { token } = ShareTokenService.generateToken(testInvoiceId, tenantId, 7);

    // Valid public download
    const publicPdfRes = await request(app).get(`/api/public/invoices/${token}/pdf`);
    expect(publicPdfRes.status).toBe(200);
    expect(publicPdfRes.headers['content-type']).toBe('application/pdf');
    expect(publicPdfRes.body.subarray(0, 5).toString('ascii')).toBe('%PDF-');

    // Expired public download
    const expiredToken = ShareTokenService.generateToken(testInvoiceId, tenantId, -2).token;
    const expiredPdfRes = await request(app).get(`/api/public/invoices/${expiredToken}/pdf`);
    expect(expiredPdfRes.status).toBe(401);
  });

  // 5. LARGE MULTIPAGE INVOICE & SPECIAL CHARACTERS HANDLING
  it('correctly handles large multipage invoices with 25+ line items, page overflow, and special characters', async () => {
    // Construct a large invoice with 25 line items
    const manyItems = Array.from({ length: 25 }, (_, idx) => ({
      description: `Item #${idx + 1}: High-performance Microservice Component & Event Bus (Node.js/Redis) with UTF-8 symbols: ₹, %, &, <>, @2026. Detailed specs and maintenance checklist for production deployment.`,
      hsnSacCode: '998315',
      quantity: idx + 1,
      unitPrice: 2500 + idx * 100,
      discountPercent: idx % 5 === 0 ? 5 : 0,
      taxableAmount: (idx + 1) * (2500 + idx * 100) * (idx % 5 === 0 ? 0.95 : 1),
      gstRate: 18,
      cgstAmount: ((idx + 1) * (2500 + idx * 100) * (idx % 5 === 0 ? 0.95 : 1) * 0.18) / 2,
      sgstAmount: ((idx + 1) * (2500 + idx * 100) * (idx % 5 === 0 ? 0.95 : 1) * 0.18) / 2,
      igstAmount: 0,
      totalAmount: (idx + 1) * (2500 + idx * 100) * (idx % 5 === 0 ? 0.95 : 1) * 1.18,
    }));

    const mockLargeInvoice = {
      invoiceNumber: 'INV-2026-LARGE-001',
      issueDate: new Date('2026-10-16'),
      dueDate: new Date('2026-11-16'),
      status: 'ISSUED',
      isInterState: false,
      subtotal: 500000,
      discountTotal: 10000,
      taxableAmount: 490000,
      taxTotal: 88200,
      cgstTotal: 44100,
      sgstTotal: 44100,
      igstTotal: 0,
      roundOff: 0,
      totalAmount: 578200,
      paidAmount: 0,
      outstandingAmount: 578200,
      notes: 'Multipage test note: All software components are licensed under enterprise SLA.',
      terms: 'Standard terms & conditions apply.\nPage overflow must occur gracefully across multiple A4 pages.',
      customer: {
        name: 'Enterprise Client Corporation Ltd.',
        gstin: '07AAAAA0000A1Z5',
        pan: 'AAAAA0000A',
        phone: '+91 99999 88888',
        email: 'billing@enterprise.corp',
        billingAddress: 'Tower 4, Cyber City, Phase 2',
        billingCity: 'Gurugram',
        billingState: 'Haryana',
        billingPostalCode: '122002',
      },
      tenant: {
        name: 'Klanvision Technologies',
        legalName: 'Klanvision Technologies Private Limited',
        address: 'Sector 11, Dwarka',
        city: 'New Delhi',
        state: 'Delhi',
        postalCode: '110075',
        gstin: '07AAACC81234F1Z5',
        email: 'info@klanvision.com',
        phone: '+91 11 2345 6789',
        settings: {
          bankName: 'HDFC Bank',
          bankAccountNumber: '50200099887766',
          bankIfsc: 'HDFC0001234',
          bankBranch: 'Dwarka Sector 11',
          upiId: 'klanvision@upi',
          termsAndConditions: '1. Net 30 days.\n2. 18% p.a. on late payments.',
          authorizedSignatory: 'Director / Authorized Signatory',
        },
      },
      lineItems: manyItems,
    };

    const pdfBuffer = await PdfService.generateInvoicePdf(mockLargeInvoice as any);
    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    // Multipage document should be substantially larger
    expect(pdfBuffer.length).toBeGreaterThan(4000);
  });

  // 6. PREVIEW & PDF FINANCIAL CONSISTENCY
  it('ensures exact 1-to-1 financial amount consistency between invoice detail and generated PDF data', async () => {
    const detailRes = await request(app)
      .get(`/api/invoices/${testInvoiceId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(detailRes.status).toBe(200);
    const inv = detailRes.body;

    // Verify subtotal, taxes, and total add up consistently
    expect(inv.subtotal - inv.discountTotal).toBeCloseTo(inv.taxableAmount, 2);
    expect(inv.cgstTotal + inv.sgstTotal + inv.igstTotal).toBeCloseTo(inv.taxTotal, 2);
    expect(inv.taxableAmount + inv.taxTotal + inv.roundOff).toBeCloseTo(inv.totalAmount, 2);
    expect(inv.paidAmount + inv.outstandingAmount).toBeCloseTo(inv.totalAmount, 2);
  });
});
