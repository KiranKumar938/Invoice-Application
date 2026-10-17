import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { authenticate, AuthRequest, requireWriteAccess } from '../middleware/auth.js';
import {
  calculateInvoiceFinancials,
  isSupplyInterState,
  CalculationLineItemInput,
} from '../services/gstCalculator.js';
import {
  getNextInvoiceNumber,
  allocateAndIncrementInvoiceNumber,
} from '../services/invoiceNumberService.js';
import { PdfService } from '../services/pdfService.js';
import { ShareTokenService } from '../services/shareTokenService.js';

const router = Router();

const lineItemSchema = z.object({
  productId: z.string().optional().nullable(),
  description: z.string().trim().min(1, 'Line item description is required'),
  hsnSacCode: z.string().default('998314'),
  quantity: z.number().gt(0, 'Quantity must be greater than zero'),
  unitPrice: z.number().min(0, 'Unit price cannot be negative'),
  discountPercent: z.number().min(0, 'Discount cannot be negative').max(100, 'Discount cannot exceed 100%').default(0),
  gstRate: z.number().min(0, 'GST rate cannot be negative').max(100).default(18),
});

const invoiceCreateSchema = z
  .object({
    customerId: z.string().min(1, 'Customer is required'),
    issueDate: z.string().or(z.date()),
    dueDate: z.string().or(z.date()),
    placeOfSupply: z.string().optional().nullable(),
    isInterState: z.boolean().optional().nullable(),
    roundOffEnabled: z.boolean().optional().nullable(),
    status: z.enum(['DRAFT', 'ISSUED']).default('ISSUED'),
    notes: z.string().optional().nullable(),
    terms: z.string().optional().nullable(),
    lineItems: z.array(lineItemSchema).min(1, 'At least one line item is required'),
  })
  .refine(
    (data) => {
      const issue = new Date(data.issueDate);
      const due = new Date(data.dueDate);
      if (isNaN(issue.getTime()) || isNaN(due.getTime())) return false;
      return due.getTime() >= issue.getTime();
    },
    {
      message: 'Due date cannot be earlier than invoice issue date',
      path: ['dueDate'],
    }
  );

// GET /api/invoices/next-number
router.get('/next-number', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const nextNumber = await getNextInvoiceNumber(req.tenantId!);
    res.json({ nextInvoiceNumber: nextNumber });
  } catch (error) {
    console.error('Error fetching next invoice number:', error);
    res.status(500).json({ error: 'Failed to preview next invoice number' });
  }
});

// Helper to escape CSV fields safely
const escapeCsvField = (field: any): string => {
  if (field === null || field === undefined) return '""';
  const str = String(field);
  return `"${str.replace(/"/g, '""')}"`;
};

// GET /api/invoices/export (Must be placed before /:id)
router.get('/export', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const search = (req.query.search as string)?.trim().toLowerCase() || '';
    const status = (req.query.status as string) || '';
    const customerId = (req.query.customerId as string) || '';
    const startDate = (req.query.startDate as string) || '';
    const endDate = (req.query.endDate as string) || '';

    const where: any = { tenantId };

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search } },
        { customer: { name: { contains: search } } },
        { customer: { gstin: { contains: search } } },
        { notes: { contains: search } },
      ];
    }

    const now = new Date();

    if (status && status !== 'ALL') {
      if (status === 'OVERDUE') {
        where.status = { notIn: ['PAID', 'CANCELLED', 'DRAFT'] };
        where.dueDate = { lt: now };
        where.outstandingAmount = { gt: 0 };
      } else {
        where.status = status;
      }
    }

    if (customerId && customerId !== 'ALL') {
      where.customerId = customerId;
    }

    if (startDate || endDate) {
      where.issueDate = {};
      if (startDate) {
        where.issueDate.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.issueDate.lte = end;
      }
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        customer: {
          select: { name: true, gstin: true, email: true, phone: true },
        },
      },
      orderBy: { issueDate: 'desc' },
    });

    const headers = [
      'Invoice Number',
      'Customer Name',
      'Customer GSTIN',
      'Issue Date',
      'Due Date',
      'Status',
      'Subtotal (INR)',
      'Discount (INR)',
      'Taxable Value (INR)',
      'CGST (INR)',
      'SGST (INR)',
      'IGST (INR)',
      'Round Off (INR)',
      'Total Amount (INR)',
      'Paid Amount (INR)',
      'Outstanding Balance (INR)',
      'Payment Status',
    ];

    const rows = invoices.map((inv) => {
      let currentStatus = inv.status;
      if (currentStatus !== 'PAID' && currentStatus !== 'CANCELLED' && currentStatus !== 'DRAFT' && new Date(inv.dueDate) < now) {
        if (inv.outstandingAmount > 0) {
          currentStatus = 'OVERDUE';
        }
      }

      return [
        escapeCsvField(inv.invoiceNumber),
        escapeCsvField(inv.customer?.name || 'N/A'),
        escapeCsvField(inv.customer?.gstin || 'Unregistered'),
        escapeCsvField(new Date(inv.issueDate).toISOString().split('T')[0]),
        escapeCsvField(new Date(inv.dueDate).toISOString().split('T')[0]),
        escapeCsvField(currentStatus),
        escapeCsvField(inv.subtotal),
        escapeCsvField(inv.discountTotal),
        escapeCsvField(inv.taxableAmount),
        escapeCsvField(inv.cgstTotal),
        escapeCsvField(inv.sgstTotal),
        escapeCsvField(inv.igstTotal),
        escapeCsvField(inv.roundOff),
        escapeCsvField(inv.totalAmount),
        escapeCsvField(inv.paidAmount),
        escapeCsvField(inv.outstandingAmount),
        escapeCsvField(inv.paymentStatus),
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="klanvision-invoices-${new Date().toISOString().split('T')[0]}.csv"`);
    res.status(200).send(csvContent);
  } catch (error) {
    console.error('Invoice CSV export error:', error);
    res.status(500).json({ error: 'Failed to export invoices to CSV' });
  }
});

// GET /api/invoices
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const search = (req.query.search as string)?.trim().toLowerCase() || '';
    const status = (req.query.status as string) || '';
    const customerId = (req.query.customerId as string) || '';
    const startDate = (req.query.startDate as string) || '';
    const endDate = (req.query.endDate as string) || '';
    const sortBy = (req.query.sortBy as string) || 'issueDate';
    const sortOrder = (req.query.sortOrder as string)?.toLowerCase() === 'asc' ? 'asc' : 'desc';
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search } },
        { customer: { name: { contains: search } } },
        { customer: { gstin: { contains: search } } },
        { notes: { contains: search } },
      ];
    }

    const now = new Date();

    if (status && status !== 'ALL') {
      if (status === 'OVERDUE') {
        where.status = { notIn: ['PAID', 'CANCELLED', 'DRAFT'] };
        where.dueDate = { lt: now };
        where.outstandingAmount = { gt: 0 };
      } else {
        where.status = status;
      }
    }

    if (customerId && customerId !== 'ALL') {
      where.customerId = customerId;
    }

    if (startDate || endDate) {
      where.issueDate = {};
      if (startDate) {
        where.issueDate.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.issueDate.lte = end;
      }
    }

    // Determine sorting order
    let orderBy: any = { issueDate: 'desc' };
    if (sortBy === 'invoiceNumber') {
      orderBy = { invoiceNumber: sortOrder };
    } else if (sortBy === 'issueDate') {
      orderBy = { issueDate: sortOrder };
    } else if (sortBy === 'dueDate') {
      orderBy = { dueDate: sortOrder };
    } else if (sortBy === 'totalAmount') {
      orderBy = { totalAmount: sortOrder };
    } else if (sortBy === 'outstandingAmount') {
      orderBy = { outstandingAmount: sortOrder };
    } else if (sortBy === 'status') {
      orderBy = { status: sortOrder };
    } else if (sortBy === 'createdAt') {
      orderBy = { createdAt: sortOrder };
    }

    const [totalCount, invoices, allTenantInvoices] = await Promise.all([
      prisma.invoice.count({ where }),
      prisma.invoice.findMany({
        where,
        include: {
          customer: {
            select: { id: true, name: true, email: true, phone: true, gstin: true, billingState: true },
          },
          lineItems: true,
          payments: {
            select: { id: true, amount: true, paymentDate: true, paymentMethod: true },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.invoice.findMany({
        where: { tenantId },
        select: {
          status: true,
          totalAmount: true,
          paidAmount: true,
          outstandingAmount: true,
          dueDate: true,
        },
      }),
    ]);

    // Check overdue statuses dynamically
    const formattedInvoices = invoices.map((inv) => {
      let currentStatus = inv.status;
      if (currentStatus !== 'PAID' && currentStatus !== 'CANCELLED' && currentStatus !== 'DRAFT' && new Date(inv.dueDate) < now) {
        if (inv.outstandingAmount > 0) {
          currentStatus = 'OVERDUE';
        }
      }

      return {
        ...inv,
        status: currentStatus,
      };
    });

    // Compute KPIs across all tenant invoices
    let totalInvoicedAmount = 0;
    let totalPaidAmount = 0;
    let totalOutstandingAmount = 0;
    let overdueCount = 0;
    let overdueAmount = 0;
    let draftCount = 0;
    let paidCount = 0;

    for (const inv of allTenantInvoices) {
      if (inv.status !== 'CANCELLED') {
        if (inv.status === 'DRAFT') {
          draftCount++;
        } else {
          totalInvoicedAmount += inv.totalAmount;
          totalPaidAmount += inv.paidAmount;
          totalOutstandingAmount += inv.outstandingAmount;

          if (inv.status === 'PAID') {
            paidCount++;
          } else if (new Date(inv.dueDate) < now && inv.outstandingAmount > 0) {
            overdueCount++;
            overdueAmount += inv.outstandingAmount;
          }
        }
      }
    }

    res.json({
      invoices: formattedInvoices,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
      kpis: {
        totalInvoices: allTenantInvoices.filter((i) => i.status !== 'CANCELLED').length,
        totalInvoicedAmount: Math.round(totalInvoicedAmount * 100) / 100,
        totalPaidAmount: Math.round(totalPaidAmount * 100) / 100,
        totalOutstandingAmount: Math.round(totalOutstandingAmount * 100) / 100,
        overdueCount,
        overdueAmount: Math.round(overdueAmount * 100) / 100,
        draftCount,
        paidCount,
      },
    });
  } catch (error) {
    console.error('Invoice fetch error:', error);
    res.status(500).json({ error: 'Failed to retrieve invoices' });
  }
});

// GET /api/invoices/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const invoiceId = req.params.id as string;
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: {
        customer: true,
        lineItems: {
          include: { product: true },
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
        },
        tenant: {
          include: { settings: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    // Dynamic overdue evaluation
    let currentStatus = invoice.status;
    if (currentStatus !== 'PAID' && currentStatus !== 'CANCELLED' && new Date(invoice.dueDate) < new Date()) {
      if (invoice.outstandingAmount > 0) {
        currentStatus = 'OVERDUE';
      }
    }

    res.json({
      ...invoice,
      status: currentStatus,
    });
  } catch (error) {
    console.error('Invoice get error:', error);
    res.status(500).json({ error: 'Failed to retrieve invoice' });
  }
});

// GET /api/invoices/:id/pdf (Download Vector Indian Tax Invoice PDF)
router.get('/:id/pdf', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const invoiceId = req.params.id as string;
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: {
        customer: true,
        lineItems: true,
        payments: { orderBy: { paymentDate: 'desc' } },
        tenant: {
          include: { settings: true },
        },
      },
    });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    const pdfBuffer = await PdfService.generateInvoicePdf(invoice as any);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);
  } catch (error) {
    console.error('Invoice PDF generation error:', error);
    res.status(500).json({ error: 'Failed to generate invoice PDF' });
  }
});

// POST /api/invoices/:id/share (Generate Secure, Expiring Share Link)
router.post('/:id/share', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const invoiceId = req.params.id as string;
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      select: { id: true, invoiceNumber: true, status: true },
    });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    const { token, expiresAt } = ShareTokenService.generateToken(invoice.id, tenantId, 7);
    res.json({
      shareToken: token,
      expiresAt,
      invoiceNumber: invoice.invoiceNumber,
    });
  } catch (error) {
    console.error('Invoice share link generation error:', error);
    res.status(500).json({ error: 'Failed to generate share link' });
  }
});

// POST /api/invoices
router.post('/', authenticate, requireWriteAccess, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const validated = invoiceCreateSchema.parse(req.body);

    const [tenant, customer, settings] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: tenantId } }),
      prisma.customer.findFirst({ where: { id: validated.customerId, tenantId } }),
      prisma.companySettings.findUnique({ where: { tenantId } }),
    ]);

    if (!tenant) {
      res.status(404).json({ error: 'Tenant company not found' });
      return;
    }
    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    // Determine GST supply type: Intra-State vs Inter-State based on actual supplier, customer, place of supply, and override
    const destinationState = validated.placeOfSupply || customer.shippingState || customer.billingState || 'Delhi';
    const isInterState = typeof validated.isInterState === 'boolean'
      ? validated.isInterState
      : isSupplyInterState(tenant.state, customer.billingState, destinationState);

    // Calculate financials strictly on server with safe arithmetic
    const calcInput: CalculationLineItemInput[] = validated.lineItems.map((item) => ({
      description: item.description,
      hsnSacCode: item.hsnSacCode,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountPercent: item.discountPercent,
      gstRate: item.gstRate,
      productId: item.productId || undefined,
    }));

    const roundOffEnabled = typeof validated.roundOffEnabled === 'boolean'
      ? validated.roundOffEnabled
      : (settings?.roundOffEnabled ?? true);
    const calcResult = calculateInvoiceFinancials(calcInput, isInterState, roundOffEnabled);

    // Create Invoice Transactionally
    const createdInvoice = await prisma.$transaction(async (tx) => {
      // 1. Allocate sequence invoice number
      const invoiceNumber = await allocateAndIncrementInvoiceNumber(tenantId, tx as any);

      // 2. Create invoice
      const inv = await tx.invoice.create({
        data: {
          tenantId,
          customerId: customer.id,
          invoiceNumber,
          issueDate: new Date(validated.issueDate),
          dueDate: new Date(validated.dueDate),
          status: validated.status,
          paymentStatus: 'UNPAID',
          isInterState: calcResult.isInterState,
          subtotal: calcResult.subtotal,
          discountTotal: calcResult.discountTotal,
          taxableAmount: calcResult.taxableAmount,
          taxTotal: calcResult.taxTotal,
          cgstTotal: calcResult.cgstTotal,
          sgstTotal: calcResult.sgstTotal,
          igstTotal: calcResult.igstTotal,
          roundOff: calcResult.roundOff,
          totalAmount: calcResult.totalAmount,
          paidAmount: 0,
          outstandingAmount: validated.status === 'ISSUED' ? calcResult.totalAmount : 0,
          notes: validated.notes || settings?.notes,
          terms: validated.terms || settings?.termsAndConditions,
          createdById: req.userId,
        },
      });

      // 3. Create line items
      for (const item of calcResult.lineItems) {
        await tx.invoiceLineItem.create({
          data: {
            invoiceId: inv.id,
            productId: item.productId || null,
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
          },
        });
      }

      // 4. Update customer outstanding balance if ISSUED
      if (validated.status === 'ISSUED') {
        await tx.customer.update({
          where: { id: customer.id },
          data: {
            currentOutstanding: {
              increment: calcResult.totalAmount,
            },
          },
        });
      }

      // 5. Audit log
      await tx.auditLog.create({
        data: {
          tenantId,
          userId: req.userId,
          action: 'CREATE',
          entityType: 'INVOICE',
          entityId: inv.id,
          details: `Invoice created (${validated.status}): ${inv.invoiceNumber} for ${customer.name} - ₹ ${inv.totalAmount.toLocaleString('en-IN')}`,
        },
      });

      return inv;
    });

    res.status(201).json(createdInvoice);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0]?.message || 'Validation error' });
      return;
    }
    console.error('Invoice creation error:', error);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

// PUT /api/invoices/:id (Edit Draft or Controlled Amendment of Issued Invoice)
router.put('/:id', authenticate, requireWriteAccess, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const invoiceId = req.params.id as string;
    const validated = invoiceCreateSchema.parse(req.body);

    const [tenant, customer, settings, existingInvoice] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: tenantId } }),
      prisma.customer.findFirst({ where: { id: validated.customerId, tenantId } }),
      prisma.companySettings.findUnique({ where: { tenantId } }),
      prisma.invoice.findFirst({
        where: { id: invoiceId, tenantId },
        include: { payments: true, lineItems: true },
      }),
    ]);

    if (!tenant) {
      res.status(404).json({ error: 'Tenant company not found' });
      return;
    }
    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }
    if (!existingInvoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    if (existingInvoice.status === 'CANCELLED') {
      res.status(400).json({ error: 'Cancelled invoices cannot be modified or amended.' });
      return;
    }

    // Controlled amendment checks:
    // If invoice was already issued with payments, cannot reassign customer
    if (existingInvoice.paidAmount > 0 && validated.customerId !== existingInvoice.customerId) {
      res.status(400).json({ error: 'Cannot change customer on an invoice with recorded payments.' });
      return;
    }

    const destinationState = validated.placeOfSupply || customer.shippingState || customer.billingState || 'Delhi';
    const isInterState = typeof validated.isInterState === 'boolean'
      ? validated.isInterState
      : isSupplyInterState(tenant.state, customer.billingState, destinationState);

    const calcInput: CalculationLineItemInput[] = validated.lineItems.map((item) => ({
      description: item.description,
      hsnSacCode: item.hsnSacCode,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountPercent: item.discountPercent,
      gstRate: item.gstRate,
      productId: item.productId || undefined,
    }));

    const roundOffEnabled = typeof validated.roundOffEnabled === 'boolean'
      ? validated.roundOffEnabled
      : (settings?.roundOffEnabled ?? true);
    const calcResult = calculateInvoiceFinancials(calcInput, isInterState, roundOffEnabled);

    if (calcResult.totalAmount < existingInvoice.paidAmount) {
      res.status(400).json({
        error: `Amended invoice total (₹${calcResult.totalAmount}) cannot be less than already recorded payment (₹${existingInvoice.paidAmount}).`,
      });
      return;
    }

    const updatedInvoice = await prisma.$transaction(async (tx) => {
      // 1. Delete previous line items
      await tx.invoiceLineItem.deleteMany({
        where: { invoiceId: existingInvoice.id },
      });

      // 2. Insert updated line items
      for (const item of calcResult.lineItems) {
        await tx.invoiceLineItem.create({
          data: {
            invoiceId: existingInvoice.id,
            productId: item.productId || null,
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
          },
        });
      }

      // 3. Balance adjustments
      const newOutstanding = calcResult.totalAmount - existingInvoice.paidAmount;
      let finalStatus: string = validated.status;
      if (existingInvoice.paidAmount > 0) {
        finalStatus = newOutstanding <= 0 ? 'PAID' : 'PARTIALLY_PAID';
      }

      // Adjust customer balance
      if (existingInvoice.status === 'DRAFT' && finalStatus === 'ISSUED') {
        // Newly issued from draft: add entire total to customer outstanding
        await tx.customer.update({
          where: { id: customer.id },
          data: {
            currentOutstanding: {
              increment: calcResult.totalAmount,
            },
          },
        });
      } else if (existingInvoice.status !== 'DRAFT') {
        if (existingInvoice.customerId === customer.id) {
          const delta = calcResult.totalAmount - existingInvoice.totalAmount;
          if (delta !== 0) {
            await tx.customer.update({
              where: { id: customer.id },
              data: {
                currentOutstanding: {
                  increment: delta,
                },
              },
            });
          }
        } else {
          // Customer changed (only allowed when paidAmount === 0)
          await tx.customer.update({
            where: { id: existingInvoice.customerId },
            data: {
              currentOutstanding: {
                decrement: existingInvoice.totalAmount,
              },
            },
          });
          await tx.customer.update({
            where: { id: customer.id },
            data: {
              currentOutstanding: {
                increment: calcResult.totalAmount,
              },
            },
          });
        }
      }

      // 4. Update the invoice record
      const inv = await tx.invoice.update({
        where: { id: existingInvoice.id },
        data: {
          customerId: customer.id,
          issueDate: new Date(validated.issueDate),
          dueDate: new Date(validated.dueDate),
          status: finalStatus,
          paymentStatus: existingInvoice.paidAmount >= calcResult.totalAmount ? 'PAID' : (existingInvoice.paidAmount > 0 ? 'PARTIALLY_PAID' : 'UNPAID'),
          isInterState: calcResult.isInterState,
          subtotal: calcResult.subtotal,
          discountTotal: calcResult.discountTotal,
          taxableAmount: calcResult.taxableAmount,
          taxTotal: calcResult.taxTotal,
          cgstTotal: calcResult.cgstTotal,
          sgstTotal: calcResult.sgstTotal,
          igstTotal: calcResult.igstTotal,
          roundOff: calcResult.roundOff,
          totalAmount: calcResult.totalAmount,
          outstandingAmount: Math.max(0, newOutstanding),
          notes: validated.notes !== undefined ? validated.notes : existingInvoice.notes,
          terms: validated.terms !== undefined ? validated.terms : existingInvoice.terms,
        },
      });

      // 5. Audit Log
      await tx.auditLog.create({
        data: {
          tenantId,
          userId: req.userId,
          action: 'UPDATE',
          entityType: 'INVOICE',
          entityId: inv.id,
          details: `Invoice amended (${existingInvoice.status} -> ${finalStatus}): ${inv.invoiceNumber} for ${customer.name} - Total: ₹ ${inv.totalAmount.toLocaleString('en-IN')}`,
        },
      });

      return inv;
    });

    res.json(updatedInvoice);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0]?.message || 'Validation error' });
      return;
    }
    console.error('Invoice amendment error:', error);
    res.status(500).json({ error: 'Failed to update invoice' });
  }
});

// POST /api/invoices/:id/duplicate
router.post('/:id/duplicate', authenticate, requireWriteAccess, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const sourceId = req.params.id as string;

    const sourceInvoice = await prisma.invoice.findFirst({
      where: { id: sourceId, tenantId },
      include: { lineItems: true, customer: true },
    });

    if (!sourceInvoice) {
      res.status(404).json({ error: 'Source invoice not found' });
      return;
    }

    const settings = await prisma.companySettings.findUnique({ where: { tenantId } });

    // Dates: issueDate = today, dueDate = today + original term duration (default 30 days)
    const today = new Date();
    const diffTime = Math.abs(new Date(sourceInvoice.dueDate).getTime() - new Date(sourceInvoice.issueDate).getTime());
    const diffDays = Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24))) || settings?.defaultPaymentTerms || 30;
    const dueDate = new Date();
    dueDate.setDate(today.getDate() + diffDays);

    const duplicatedInvoice = await prisma.$transaction(async (tx) => {
      const invoiceNumber = await allocateAndIncrementInvoiceNumber(tenantId, tx as any);

      const inv = await tx.invoice.create({
        data: {
          tenantId,
          customerId: sourceInvoice.customerId,
          invoiceNumber,
          issueDate: today,
          dueDate,
          status: 'DRAFT',
          paymentStatus: 'UNPAID',
          isInterState: sourceInvoice.isInterState,
          subtotal: sourceInvoice.subtotal,
          discountTotal: sourceInvoice.discountTotal,
          taxableAmount: sourceInvoice.taxableAmount,
          taxTotal: sourceInvoice.taxTotal,
          cgstTotal: sourceInvoice.cgstTotal,
          sgstTotal: sourceInvoice.sgstTotal,
          igstTotal: sourceInvoice.igstTotal,
          roundOff: sourceInvoice.roundOff,
          totalAmount: sourceInvoice.totalAmount,
          paidAmount: 0,
          outstandingAmount: 0,
          notes: sourceInvoice.notes,
          terms: sourceInvoice.terms,
          createdById: req.userId,
        },
      });

      for (const item of sourceInvoice.lineItems) {
        await tx.invoiceLineItem.create({
          data: {
            invoiceId: inv.id,
            productId: item.productId,
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
          },
        });
      }

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: req.userId,
          action: 'CREATE',
          entityType: 'INVOICE',
          entityId: inv.id,
          details: `Invoice ${sourceInvoice.invoiceNumber} duplicated as draft ${inv.invoiceNumber}`,
        },
      });

      return inv;
    });

    res.status(201).json(duplicatedInvoice);
  } catch (error) {
    console.error('Invoice duplication error:', error);
    res.status(500).json({ error: 'Failed to duplicate invoice' });
  }
});

// POST /api/invoices/:id/cancel
router.post('/:id/cancel', authenticate, requireWriteAccess, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const invoiceId = req.params.id as string;
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: { payments: true },
    });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    if (invoice.status === 'CANCELLED') {
      res.status(400).json({ error: 'Invoice is already cancelled' });
      return;
    }

    if (invoice.paidAmount > 0) {
      res.status(400).json({ error: 'Cannot cancel an invoice with recorded payments. Please refund or delete payments first.' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          status: 'CANCELLED',
          outstandingAmount: 0,
        },
      });

      // Reduce customer outstanding
      if (invoice.status !== 'DRAFT') {
        await tx.customer.update({
          where: { id: invoice.customerId },
          data: {
            currentOutstanding: {
              decrement: invoice.outstandingAmount,
            },
          },
        });
      }

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: req.userId,
          action: 'CANCEL',
          entityType: 'INVOICE',
          entityId: invoice.id,
          details: `Invoice ${invoice.invoiceNumber} was cancelled`,
        },
      });
    });

    res.json({ message: 'Invoice cancelled successfully' });
  } catch (error) {
    console.error('Invoice cancel error:', error);
    res.status(500).json({ error: 'Failed to cancel invoice' });
  }
});

export default router;
