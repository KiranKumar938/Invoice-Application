import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/index.js';
import { prisma } from '../src/prisma.js';

describe('Klanvision Settings Module & Multi-Tenant Configuration Tests', () => {
  let primaryToken: string;
  let primaryTenantId: string;
  let primaryUserId: string;

  let secondaryToken: string;
  let secondaryTenantId: string;

  beforeAll(async () => {
    // 1. Authenticate with Primary Tenant (Admin/Owner)
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@klanvision.com',
        password: 'Password123!',
      });

    expect(loginRes.status).toBe(200);
    primaryToken = loginRes.body.token;
    primaryTenantId = loginRes.body.tenant.id;
    primaryUserId = loginRes.body.user.id;

    // 2. Register a Secondary Tenant for isolation testing
    const uniqueSuffix = Date.now();
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Secondary Admin',
        email: `tenant2_admin_${uniqueSuffix}@example.com`,
        password: 'Password123!',
        companyName: `Secondary Corp ${uniqueSuffix}`,
      });

    expect(regRes.status).toBe(201);
    secondaryToken = regRes.body.token;
    secondaryTenantId = regRes.body.tenant.id;
  });

  afterAll(async () => {
    // Hermetic test hygiene: Restore primary tenant default state and prefix
    await prisma.tenant.update({
      where: { id: primaryTenantId },
      data: {
        name: 'Klanvision Technologies',
        legalName: 'Klanvision Technologies Pvt. Ltd.',
        state: 'Delhi',
        city: 'New Delhi',
        address: 'A-1, 3rd Floor, Gokul Garden, Sector-11, Dwarka',
        gstin: '07AAACC81234F1Z5',
      },
    });

    await prisma.companySettings.update({
      where: { tenantId: primaryTenantId },
      data: {
        invoicePrefix: 'INV-2025-',
        invoiceNumberPadding: 4,
        bankName: 'HDFC Bank',
        bankIfsc: 'HDFC0001234',
        defaultPaymentTerms: 30,
      },
    });
  });

  it('1. GET /api/settings retrieves company profile, settings defaults, and GST verification', async () => {
    const res = await request(app)
      .get('/api/settings')
      .set('Authorization', `Bearer ${primaryToken}`);

    expect(res.status).toBe(200);
    expect(res.body.company).toBeDefined();
    expect(res.body.settings).toBeDefined();
    expect(res.body.gstVerification).toBeDefined();
    expect(res.body.permissions.canEditSettings).toBe(true);
    expect(res.body.company.id).toBe(primaryTenantId);
  });

  it('2. PUT /api/settings persists company profile updates', async () => {
    const updatePayload = {
      company: {
        name: 'Klanvision Global Technologies',
        legalName: 'Klanvision Global Technologies Pvt. Ltd.',
        email: 'billing@klanvision.com',
        phone: '+91 98765 00000',
        website: 'https://global.klanvision.com',
        address: 'Plot 42, Connaught Place, Central Delhi',
        city: 'New Delhi',
        state: 'Delhi',
        postalCode: '110001',
        pan: 'AAACC81234F',
        cin: 'U72900DL2020PTC098765',
      },
    };

    const res = await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${primaryToken}`)
      .send(updatePayload);

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('saved');

    // Verify persistence in DB
    const updatedTenant = await prisma.tenant.findUnique({
      where: { id: primaryTenantId },
    });

    expect(updatedTenant?.legalName).toBe('Klanvision Global Technologies Pvt. Ltd.');
    expect(updatedTenant?.city).toBe('New Delhi');
    expect(updatedTenant?.state).toBe('Delhi');
    expect(updatedTenant?.cin).toBe('U72900DL2020PTC098765');
  });

  it('3. Validates GSTIN structure and clearly distinguishes configuration from verified government registration', async () => {
    // A. Rejects invalid GSTIN format
    const invalidGstRes = await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${primaryToken}`)
      .send({
        company: {
          gstin: 'INVALID_GSTIN_123',
        },
      });

    expect(invalidGstRes.status).toBe(400);
    expect(invalidGstRes.body.error).toBeDefined();

    // B. Verifies valid GSTIN with GSTN portal sandbox
    const validGstin = '07AAACC81234F1Z5';
    const verifyRes = await request(app)
      .post('/api/settings/gst/verify')
      .set('Authorization', `Bearer ${primaryToken}`)
      .send({ gstin: validGstin });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.details.verified).toBe(true);
    expect(verifyRes.body.details.status).toBe('Active');
    expect(verifyRes.body.details.taxpayerType).toBe('Regular');

    // Check that settings reflect verified status
    const getRes = await request(app)
      .get('/api/settings')
      .set('Authorization', `Bearer ${primaryToken}`);

    expect(getRes.body.gstVerification.status).toBe('GOVT_VERIFIED');
    expect(getRes.body.gstVerification.isValidFormat).toBe(true);
  });

  it('4. Safe Invoice Numbering: prevents duplicate sequence collision and applies custom prefix to new invoices', async () => {
    const customPrefix = `KLN-${Date.now().toString().slice(-4)}-`;

    // A. Update invoice numbering
    const updateNumRes = await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${primaryToken}`)
      .send({
        settings: {
          invoicePrefix: customPrefix,
          invoiceNumberPadding: 5,
          nextInvoiceNumber: 10,
          sequenceResetFrequency: 'YEARLY',
        },
      });

    expect(updateNumRes.status).toBe(200);

    // B. Create a customer and invoice under the new numbering rule
    const cust = await prisma.customer.create({
      data: {
        tenantId: primaryTenantId,
        name: `Numbering Test Customer ${Date.now()}`,
        email: `num_${Date.now()}@test.com`,
        phone: '9999900000',
        billingAddress: 'Street 1',
        billingCity: 'New Delhi',
        billingState: 'Delhi',
        billingPostalCode: '110001',
      },
    });

    const invRes = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${primaryToken}`)
      .send({
        customerId: cust.id,
        issueDate: '2026-10-16',
        dueDate: '2026-11-15',
        lineItems: [
          {
            description: 'Consulting Service',
            hsnSacCode: '998314',
            quantity: 1,
            unitPrice: 5000,
            discountPercent: 0,
            gstRate: 18,
          },
        ],
        status: 'ISSUED',
        saveAsDraft: false,
      });

    expect(invRes.status).toBe(201);
    expect(invRes.body.invoiceNumber).toBe(`${customPrefix}00010`);

    // C. Collision Guard: Attempting to reset sequence backwards below the highest existing invoice number is rejected!
    const collisionRes = await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${primaryToken}`)
      .send({
        settings: {
          invoicePrefix: customPrefix,
          nextInvoiceNumber: 5, // Less than already issued 10!
        },
      });

    expect(collisionRes.status).toBe(400);
    expect(collisionRes.body.error).toContain('already exists');
  });

  it('5. Persists templates, banking payment methods, and regional preferences', async () => {
    const templateAndBankingPayload = {
      settings: {
        templateTheme: 'CLASSIC',
        primaryColor: '#0c1938',
        accentColor: '#2563eb',
        showCompanyLogo: true,
        showTaxSummary: true,
        showPaymentQr: true,
        termsAndConditions: 'Payment due on delivery.\nNo returns after 7 days.',
        notes: 'Special discount applied.',
        footerText: 'Official digitally signed invoice.',

        // Banking
        bankName: 'Axis Bank Ltd.',
        accountHolderName: 'Klanvision Global Technologies Pvt. Ltd.',
        bankAccountNumber: '912000987654321',
        bankIfsc: 'UTIB0001234',
        bankBranch: 'DLF Cyber City, Gurugram',
        upiId: 'klanvision.global@axisbank',
        enableUpi: true,
        enableNetBanking: true,
        enableCardPayments: true,
        enableCash: false,
        enableCheque: true,
        paymentInstructions: 'Please quote invoice number in NEFT remarks.',

        // Regional Preferences
        currency: 'INR',
        currencySymbol: '₹',
        dateFormat: 'DD/MM/YYYY',
        timeZone: 'Asia/Kolkata',
        defaultPaymentTerms: 45,
        defaultTaxRate: 18.0,
        roundOffEnabled: true,
      },
    };

    const res = await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${primaryToken}`)
      .send(templateAndBankingPayload);

    expect(res.status).toBe(200);

    const savedSettings = await prisma.companySettings.findUnique({
      where: { tenantId: primaryTenantId },
    });

    expect(savedSettings?.templateTheme).toBe('CLASSIC');
    expect(savedSettings?.bankName).toBe('Axis Bank Ltd.');
    expect(savedSettings?.bankIfsc).toBe('UTIB0001234');
    expect(savedSettings?.upiId).toBe('klanvision.global@axisbank');
    expect(savedSettings?.defaultPaymentTerms).toBe(45);
  });

  it('6. Notifications: sends test verification email and runs scheduled reminder scan', async () => {
    // A. Send test notification email
    const emailRes = await request(app)
      .post('/api/settings/notifications/test-email')
      .set('Authorization', `Bearer ${primaryToken}`)
      .send({ targetEmail: 'test-recipient@klanvision.com' });

    expect(emailRes.status).toBe(200);
    expect(emailRes.body.delivery.success).toBe(true);

    // B. Trigger scheduled reminders scan
    const reminderRes = await request(app)
      .post('/api/settings/notifications/trigger-reminders')
      .set('Authorization', `Bearer ${primaryToken}`);

    expect(reminderRes.status).toBe(200);
    expect(reminderRes.body.result).toBeDefined();
    expect(reminderRes.body.result.tenantId).toBe(primaryTenantId);
  });

  it('7. Team & Roles: invites team member, updates role, and enforces server permission guards', async () => {
    const inviteEmail = `accountant_${Date.now()}@klanvision.com`;

    // A. Invite team member with ACCOUNTANT role
    const inviteRes = await request(app)
      .post('/api/settings/users/invite')
      .set('Authorization', `Bearer ${primaryToken}`)
      .send({
        name: 'Priya Sharma',
        email: inviteEmail,
        role: 'ACCOUNTANT',
      });

    expect(inviteRes.status).toBe(201);
    expect(inviteRes.body.user.email).toBe(inviteEmail);
    expect(inviteRes.body.user.role).toBe('ACCOUNTANT');
    const invitedUserId = inviteRes.body.user.id;

    // B. List team members
    const listRes = await request(app)
      .get('/api/settings/users')
      .set('Authorization', `Bearer ${primaryToken}`);

    expect(listRes.status).toBe(200);
    const member = listRes.body.users.find((u: any) => u.email === inviteEmail);
    expect(member).toBeDefined();
    expect(member.role).toBe('ACCOUNTANT');

    // C. Update role to ADMIN
    const updateRoleRes = await request(app)
      .put(`/api/settings/users/${invitedUserId}/role`)
      .set('Authorization', `Bearer ${primaryToken}`)
      .send({ role: 'ADMIN' });

    expect(updateRoleRes.status).toBe(200);
    expect(updateRoleRes.body.membership.role).toBe('ADMIN');

    // D. Safety Guard: Prevent revoking oneself
    const selfRevokeRes = await request(app)
      .delete(`/api/settings/users/${primaryUserId}`)
      .set('Authorization', `Bearer ${primaryToken}`);

    expect(selfRevokeRes.status).toBe(400);
    expect(selfRevokeRes.body.error).toContain('own workspace access');

    // E. Revoke invited user access
    const revokeRes = await request(app)
      .delete(`/api/settings/users/${invitedUserId}`)
      .set('Authorization', `Bearer ${primaryToken}`);

    expect(revokeRes.status).toBe(200);

    // Verify removal
    const checkRes = await request(app)
      .get('/api/settings/users')
      .set('Authorization', `Bearer ${primaryToken}`);

    const removed = checkRes.body.users.find((u: any) => u.id === invitedUserId);
    expect(removed).toBeUndefined();
  });

  it('8. Strict Multi-Tenant Isolation: Tenant A settings cannot bleed into or mutate Tenant B invoices or settings', async () => {
    // Primary Tenant has custom prefix and Axis Bank
    // Verify Secondary Tenant has its own isolated settings
    const secSettingsRes = await request(app)
      .get('/api/settings')
      .set('Authorization', `Bearer ${secondaryToken}`);

    expect(secSettingsRes.status).toBe(200);
    expect(secSettingsRes.body.company.id).toBe(secondaryTenantId);
    expect(secSettingsRes.body.company.id).not.toBe(primaryTenantId);

    // Update Secondary Tenant with distinct prefix 'SEC-INV-'
    const secPrefix = 'SEC-INV-';
    await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${secondaryToken}`)
      .send({
        settings: {
          invoicePrefix: secPrefix,
          nextInvoiceNumber: 1,
          bankName: 'State Bank of India',
        },
      });

    // Create an invoice under Secondary Tenant
    const secCust = await prisma.customer.create({
      data: {
        tenantId: secondaryTenantId,
        name: 'Secondary Customer',
        email: `seccust_${Date.now()}@example.com`,
        phone: '9888811111',
        billingAddress: 'MG Road',
        billingCity: 'Bengaluru',
        billingState: 'Karnataka',
        billingPostalCode: '560001',
      },
    });

    const secInvRes = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${secondaryToken}`)
      .send({
        customerId: secCust.id,
        issueDate: '2026-10-16',
        dueDate: '2026-11-15',
        lineItems: [
          {
            description: 'Cloud Infrastructure Plan',
            hsnSacCode: '998313',
            quantity: 1,
            unitPrice: 12000,
            discountPercent: 0,
            gstRate: 18,
          },
        ],
        status: 'ISSUED',
        saveAsDraft: false,
      });

    expect(secInvRes.status).toBe(201);
    expect(secInvRes.body.invoiceNumber).toMatch(/^SEC-INV-/);

    // Verify Primary Tenant's settings remain completely unaffected
    const primarySettings = await prisma.companySettings.findUnique({
      where: { tenantId: primaryTenantId },
    });
    expect(primarySettings?.bankName).toBe('Axis Bank Ltd.');
    expect(primarySettings?.invoicePrefix).not.toBe(secPrefix);
  });
});
