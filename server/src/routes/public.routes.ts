import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { ShareTokenService } from '../services/shareTokenService.js';
import { PdfService } from '../services/pdfService.js';

const router = Router();

/**
 * GET /api/public/invoices/:token
 * Publicly view a sanitized tax invoice using an expiring, cryptographically signed share token.
 * Prevents enumeration, predictable URL attacks, and tenant data leakage.
 */
router.get('/invoices/:token', async (req: Request, res: Response): Promise<void> => {
  try {
    const token = Array.isArray(req.params.token) ? req.params.token[0] : (req.params.token as string);
    let payload;
    try {
      payload = ShareTokenService.verifyToken(token);
    } catch (err: any) {
      res.status(401).json({ error: err.message || 'Share link is invalid or expired' });
      return;
    }

    const invoice = await prisma.invoice.findFirst({
      where: {
        id: payload.invoiceId,
        tenantId: payload.tenantId,
      },
      include: {
        customer: true,
        lineItems: true,
        tenant: {
          include: { settings: true },
        },
      },
    });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found or no longer available' });
      return;
    }

    // Dynamic overdue evaluation
    let currentStatus = invoice.status;
    if (currentStatus !== 'PAID' && currentStatus !== 'CANCELLED' && new Date(invoice.dueDate) < new Date()) {
      if (invoice.outstandingAmount > 0) {
        currentStatus = 'OVERDUE';
      }
    }

    // Return sanitized public invoice payload (strictly no internal credentials or unrelated tenant data)
    res.json({
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      status: currentStatus,
      isInterState: invoice.isInterState,
      subtotal: invoice.subtotal,
      discountTotal: invoice.discountTotal,
      taxableAmount: invoice.taxableAmount,
      taxTotal: invoice.taxTotal,
      cgstTotal: invoice.cgstTotal,
      sgstTotal: invoice.sgstTotal,
      igstTotal: invoice.igstTotal,
      roundOff: invoice.roundOff,
      totalAmount: invoice.totalAmount,
      paidAmount: invoice.paidAmount,
      outstandingAmount: invoice.outstandingAmount,
      notes: invoice.notes,
      terms: invoice.terms,
      customer: {
        name: invoice.customer.name,
        gstin: invoice.customer.gstin,
        pan: invoice.customer.pan,
        phone: invoice.customer.phone,
        email: invoice.customer.email,
        billingAddress: invoice.customer.billingAddress,
        billingCity: invoice.customer.billingCity,
        billingState: invoice.customer.billingState,
        billingPostalCode: invoice.customer.billingPostalCode,
        shippingAddress: invoice.customer.shippingAddress,
        shippingCity: invoice.customer.shippingCity,
        shippingState: invoice.customer.shippingState,
        shippingPostalCode: invoice.customer.shippingPostalCode,
      },
      tenant: {
        name: invoice.tenant.name,
        legalName: invoice.tenant.legalName,
        address: invoice.tenant.address,
        city: invoice.tenant.city,
        state: invoice.tenant.state,
        postalCode: invoice.tenant.postalCode,
        country: invoice.tenant.country,
        gstin: invoice.tenant.gstin,
        pan: invoice.tenant.pan,
        email: invoice.tenant.email,
        phone: invoice.tenant.phone,
        website: invoice.tenant.website,
        logoUrl: invoice.tenant.logoUrl,
        settings: invoice.tenant.settings
          ? {
              bankName: invoice.tenant.settings.bankName,
              bankAccountNumber: invoice.tenant.settings.bankAccountNumber,
              bankIfsc: invoice.tenant.settings.bankIfsc,
              bankBranch: invoice.tenant.settings.bankBranch,
              upiId: invoice.tenant.settings.upiId,
              termsAndConditions: invoice.tenant.settings.termsAndConditions,
              notes: invoice.tenant.settings.notes,
              authorizedSignatory: invoice.tenant.settings.authorizedSignatory,
            }
          : null,
      },
      lineItems: invoice.lineItems.map((item) => ({
        id: item.id,
        description: item.description,
        hsnSacCode: item.hsnSacCode,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPercent: item.discountPercent,
        discountAmount: item.discountAmount,
        taxableAmount: item.taxableAmount,
        gstRate: item.gstRate,
        cgstAmount: item.cgstAmount,
        sgstAmount: item.sgstAmount,
        igstAmount: item.igstAmount,
        totalAmount: item.totalAmount,
      })),
      expiresAt: new Date(payload.expiresAt),
    });
  } catch (error) {
    console.error('Public invoice view error:', error);
    res.status(500).json({ error: 'Failed to display public invoice' });
  }
});

/**
 * GET /api/public/invoices/:token/pdf
 * Publicly stream and download PDF for a shared invoice.
 */
router.get('/invoices/:token/pdf', async (req: Request, res: Response): Promise<void> => {
  try {
    const token = Array.isArray(req.params.token) ? req.params.token[0] : (req.params.token as string);
    let payload;
    try {
      payload = ShareTokenService.verifyToken(token);
    } catch (err: any) {
      res.status(401).json({ error: err.message || 'Share link is invalid or expired' });
      return;
    }

    const invoice = await prisma.invoice.findFirst({
      where: {
        id: payload.invoiceId,
        tenantId: payload.tenantId,
      },
      include: {
        customer: true,
        lineItems: true,
        tenant: {
          include: { settings: true },
        },
      },
    });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found or no longer available' });
      return;
    }

    const pdfBuffer = await PdfService.generateInvoicePdf(invoice as any);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);
  } catch (error) {
    console.error('Public PDF download error:', error);
    res.status(500).json({ error: 'Failed to generate invoice PDF' });
  }
});

export default router;
