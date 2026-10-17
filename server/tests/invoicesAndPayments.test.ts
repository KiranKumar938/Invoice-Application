import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/index.js';

describe('Invoices and Payments Workflow Tests', () => {
  let adminToken: string;
  let customerId: string;
  let invoiceId: string;
  let invoiceTotal: number;

  beforeAll(async () => {
    // 1. Authenticate admin
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@klanvision.com',
        password: 'Password123!',
      });
    adminToken = loginRes.body.token;

    // 2. Fetch customers
    const custRes = await request(app)
      .get('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(custRes.body.customers.length).toBeGreaterThan(0);
    const stableCust = custRes.body.customers.find((c: any) => !c.name.includes('Acme Industrial')) || custRes.body.customers[0];
    customerId = stableCust.id;
  });

  it('generates next sequential invoice number', async () => {
    const res = await request(app)
      .get('/api/invoices/next-number')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.nextInvoiceNumber).toBeDefined();
    expect(res.body.nextInvoiceNumber).toMatch(/^INV-/);
  });

  it('creates an issued invoice and calculates accurate GST financials', async () => {
    const futureDueDate = new Date();
    futureDueDate.setDate(futureDueDate.getDate() + 30);

    const newInvoicePayload = {
      customerId,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: futureDueDate.toISOString().split('T')[0],
      status: 'ISSUED',
      lineItems: [
        {
          description: 'Automated Billing Architecture Setup',
          hsnSacCode: '998314',
          quantity: 2,
          unitPrice: 20000,
          discountPercent: 10, // 40,000 gross - 4,000 disc = 36,000 taxable
          gstRate: 18,
        },
      ],
    };

    const res = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(newInvoicePayload);

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.invoiceNumber).toBeDefined();
    expect(res.body.subtotal).toBe(40000);
    expect(res.body.discountTotal).toBe(4000);
    expect(res.body.taxableAmount).toBe(36000);
    // 18% of 36000 = 6480
    expect(res.body.taxTotal).toBe(6480);
    expect(res.body.totalAmount).toBe(42480);
    expect(res.body.outstandingAmount).toBe(42480);

    invoiceId = res.body.id;
    invoiceTotal = res.body.totalAmount;
  });

  it('records partial and full payments and updates invoice and customer balances', async () => {
    // 1. Partial payment of ₹ 20,000
    const partialPaymentRes = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId,
        invoiceId,
        amount: 20000,
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'UPI',
        transactionReference: `UPI_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        notes: 'Partial settlement via UPI',
      });

    expect(partialPaymentRes.status).toBe(201);

    // Verify invoice status updated to PARTIALLY_PAID and balance reduced
    const checkPartialInv = await request(app)
      .get(`/api/invoices/${invoiceId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(checkPartialInv.status).toBe(200);
    expect(checkPartialInv.body.status).toBe('PARTIALLY_PAID');
    expect(checkPartialInv.body.paidAmount).toBe(20000);
    expect(checkPartialInv.body.outstandingAmount).toBe(invoiceTotal - 20000);

    // 2. Settle the remaining balance
    const remainingBalance = invoiceTotal - 20000;
    const fullPaymentRes = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId,
        invoiceId,
        amount: remainingBalance,
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'BANK_TRANSFER',
        transactionReference: `UTR_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      });

    expect(fullPaymentRes.status).toBe(201);

    // Verify invoice status is now PAID and outstanding is 0
    const checkFullInv = await request(app)
      .get(`/api/invoices/${invoiceId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(checkFullInv.status).toBe(200);
    expect(checkFullInv.body.status).toBe('PAID');
    expect(checkFullInv.body.paidAmount).toBe(invoiceTotal);
    expect(checkFullInv.body.outstandingAmount).toBe(0);
  });
});
