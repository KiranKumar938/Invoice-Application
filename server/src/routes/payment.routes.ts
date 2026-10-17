import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { authenticate, AuthRequest, requireWriteAccess } from '../middleware/auth.js';
import { roundToTwo } from '../services/gstCalculator.js';
import { PdfService } from '../services/pdfService.js';

const router = Router();

const allocationItemSchema = z.object({
  invoiceId: z.string().min(1, 'Invoice ID is required'),
  amount: z.number().gt(0, 'Allocation amount must be greater than zero'),
});

const paymentCreateSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  invoiceId: z.string().optional().nullable(),
  amount: z.number().gt(0, 'Payment amount must be greater than 0'),
  paymentDate: z.string().or(z.date()).default(() => new Date()),
  paymentMethod: z.enum(['UPI', 'BANK_TRANSFER', 'CASH', 'CARD', 'CHEQUE']).default('BANK_TRANSFER'),
  transactionReference: z.string().trim().optional().nullable(),
  notes: z.string().optional().nullable(),
  allocations: z.array(allocationItemSchema).optional().nullable(),
});

const reversePaymentSchema = z.object({
  reason: z.string().trim().optional().nullable(),
});

// Helper for CSV escaping
const escapeCsv = (field: any): string => {
  if (field === null || field === undefined) return '""';
  const str = String(field);
  return `"${str.replace(/"/g, '""')}"`;
};

// GET /api/payments/export (Must precede /:id)
router.get('/export', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const search = (req.query.search as string)?.trim().toLowerCase() || '';
    const customerId = (req.query.customerId as string) || '';
    const paymentMethod = (req.query.paymentMethod as string) || '';
    const status = (req.query.status as string) || '';
    const startDate = (req.query.startDate as string) || '';
    const endDate = (req.query.endDate as string) || '';

    const where: any = { tenantId };

    if (search) {
      where.OR = [
        { paymentNumber: { contains: search } },
        { transactionReference: { contains: search } },
        { customer: { name: { contains: search } } },
        { customer: { gstin: { contains: search } } },
        { notes: { contains: search } },
        { invoice: { invoiceNumber: { contains: search } } },
      ];
    }

    if (customerId) where.customerId = customerId;
    if (paymentMethod && paymentMethod !== 'ALL') where.paymentMethod = paymentMethod;
    if (status && status !== 'ALL') where.status = status;

    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) where.paymentDate.gte = new Date(startDate);
      if (endDate) {
        const eDate = new Date(endDate);
        eDate.setHours(23, 59, 59, 999);
        where.paymentDate.lte = eDate;
      }
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        customer: true,
        invoice: true,
        allocations: { include: { invoice: true } },
      },
      orderBy: { paymentDate: 'desc' },
    });

    const headers = [
      'Payment Number',
      'Date',
      'Customer Name',
      'Customer GSTIN',
      'Invoice Number(s)',
      'Amount (INR)',
      'Payment Method',
      'UTR / Transaction Ref',
      'Status',
      'Notes',
    ];

    const rows = payments.map((pmt) => {
      const invNumbers = pmt.allocations && pmt.allocations.length > 0
        ? pmt.allocations.map((a) => a.invoice?.invoiceNumber).filter(Boolean).join('; ')
        : pmt.invoice?.invoiceNumber || 'Account Balance Settlement';

      const d = new Date(pmt.paymentDate);
      const dateStr = d.toISOString().split('T')[0];

      return [
        escapeCsv(pmt.paymentNumber),
        escapeCsv(dateStr),
        escapeCsv(pmt.customer?.name || ''),
        escapeCsv(pmt.customer?.gstin || ''),
        escapeCsv(invNumbers),
        escapeCsv(pmt.amount.toFixed(2)),
        escapeCsv(pmt.paymentMethod),
        escapeCsv(pmt.transactionReference || ''),
        escapeCsv(pmt.status),
        escapeCsv(pmt.notes || ''),
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="klanvision-payments-${new Date().toISOString().split('T')[0]}.csv"`
    );
    res.send(csvContent);
  } catch (error) {
    console.error('Payment CSV export error:', error);
    res.status(500).json({ error: 'Failed to export payments' });
  }
});

// GET /api/payments
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const search = (req.query.search as string)?.trim().toLowerCase() || '';
    const customerId = (req.query.customerId as string) || '';
    const invoiceId = (req.query.invoiceId as string) || '';
    const paymentMethod = (req.query.paymentMethod as string) || '';
    const status = (req.query.status as string) || '';
    const startDate = (req.query.startDate as string) || '';
    const endDate = (req.query.endDate as string) || '';
    const sortBy = (req.query.sortBy as string) || 'paymentDate';
    const sortOrder = (req.query.sortOrder as string) === 'asc' ? 'asc' : 'desc';
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (search) {
      where.OR = [
        { paymentNumber: { contains: search } },
        { transactionReference: { contains: search } },
        { customer: { name: { contains: search } } },
        { customer: { gstin: { contains: search } } },
        { notes: { contains: search } },
        { invoice: { invoiceNumber: { contains: search } } },
      ];
    }

    if (customerId) where.customerId = customerId;
    if (paymentMethod && paymentMethod !== 'ALL') where.paymentMethod = paymentMethod;
    if (status && status !== 'ALL') where.status = status;

    if (invoiceId) {
      where.OR = [
        { invoiceId },
        { allocations: { some: { invoiceId } } },
      ];
    }

    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) where.paymentDate.gte = new Date(startDate);
      if (endDate) {
        const eDate = new Date(endDate);
        eDate.setHours(23, 59, 59, 999);
        where.paymentDate.lte = eDate;
      }
    }

    let orderBy: any = { paymentDate: sortOrder };
    if (sortBy === 'amount') orderBy = { amount: sortOrder };
    else if (sortBy === 'paymentNumber') orderBy = { paymentNumber: sortOrder };
    else if (sortBy === 'createdAt') orderBy = { createdAt: sortOrder };

    const [totalCount, payments, allTenantPayments] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        include: {
          customer: {
            select: { id: true, name: true, email: true, phone: true, gstin: true },
          },
          invoice: {
            select: { id: true, invoiceNumber: true, totalAmount: true, outstandingAmount: true, status: true },
          },
          allocations: {
            include: {
              invoice: {
                select: { id: true, invoiceNumber: true, totalAmount: true, outstandingAmount: true, status: true },
              },
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.payment.findMany({
        where: { tenantId },
        select: {
          amount: true,
          status: true,
          paymentMethod: true,
          paymentDate: true,
        },
      }),
    ]);

    // KPI Aggregations
    let totalCollections = 0;
    let thisMonthCollections = 0;
    let reversedCount = 0;
    let reversedAmount = 0;
    const methodCounts: Record<string, number> = {
      BANK_TRANSFER: 0,
      UPI: 0,
      CASH: 0,
      CARD: 0,
      CHEQUE: 0,
    };

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    for (const p of allTenantPayments) {
      if (p.status === 'REVERSED') {
        reversedCount++;
        reversedAmount += p.amount;
      } else if (p.status === 'SUCCESS') {
        totalCollections += p.amount;
        const pDate = new Date(p.paymentDate);
        if (pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear) {
          thisMonthCollections += p.amount;
        }
        if (methodCounts[p.paymentMethod] !== undefined) {
          methodCounts[p.paymentMethod]++;
        }
      }
    }

    res.json({
      payments,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
      kpis: {
        totalCollections: roundToTwo(totalCollections),
        thisMonthCollections: roundToTwo(thisMonthCollections),
        totalTransactions: allTenantPayments.length,
        reversedCount,
        reversedAmount: roundToTwo(reversedAmount),
        methodCounts,
      },
    });
  } catch (error) {
    console.error('Payment fetch error:', error);
    res.status(500).json({ error: 'Failed to retrieve payments' });
  }
});

// GET /api/payments/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const paymentId = req.params.id as string;

    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, tenantId },
      include: {
        customer: true,
        invoice: true,
        allocations: {
          include: {
            invoice: true,
          },
        },
        tenant: {
          include: { settings: true },
        },
      },
    });

    if (!payment) {
      res.status(404).json({ error: 'Payment record not found' });
      return;
    }

    res.json(payment);
  } catch (error) {
    console.error('Payment detail error:', error);
    res.status(500).json({ error: 'Failed to retrieve payment details' });
  }
});

// GET /api/payments/:id/receipt (Vector PDF Receipt)
router.get('/:id/receipt', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const paymentId = req.params.id as string;

    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, tenantId },
      include: {
        customer: true,
        allocations: {
          include: {
            invoice: true,
          },
        },
        tenant: {
          include: { settings: true },
        },
      },
    });

    if (!payment) {
      res.status(404).json({ error: 'Payment record not found' });
      return;
    }

    const pdfBuffer = await PdfService.generateReceiptPdf(payment as any);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="RECEIPT-${payment.paymentNumber}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);
  } catch (error) {
    console.error('Payment receipt generation error:', error);
    res.status(500).json({ error: 'Failed to generate payment receipt' });
  }
});

// POST /api/payments (Record Payment with Idempotency & Validation)
router.post('/', authenticate, requireWriteAccess, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const validated = paymentCreateSchema.parse(req.body);

    const paymentAmount = roundToTwo(validated.amount);
    const paymentDate = new Date(validated.paymentDate);

    // 1. Verify Customer
    const customer = await prisma.customer.findFirst({
      where: { id: validated.customerId, tenantId },
    });
    if (!customer) {
      res.status(404).json({ error: 'Customer not found in workspace' });
      return;
    }

    // 2. Idempotency & Duplicate Submission Protection
    if (validated.transactionReference) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const duplicatePmt = await prisma.payment.findFirst({
        where: {
          tenantId,
          paymentMethod: validated.paymentMethod,
          transactionReference: validated.transactionReference,
          createdAt: { gte: fiveMinutesAgo },
          status: 'SUCCESS',
        },
      });

      if (duplicatePmt) {
        res.status(409).json({
          error: `Duplicate payment detected: Reference "${validated.transactionReference}" was already recorded as ${duplicatePmt.paymentNumber}.`,
        });
        return;
      }
    }

    // 3. Prepare and Validate Allocations
    let targetAllocations: Array<{ invoiceId: string; amount: number }> = [];

    if (validated.allocations && validated.allocations.length > 0) {
      targetAllocations = validated.allocations.map((a) => ({
        invoiceId: a.invoiceId,
        amount: roundToTwo(a.amount),
      }));

      const allocTotal = roundToTwo(targetAllocations.reduce((acc, curr) => acc + curr.amount, 0));
      if (allocTotal > paymentAmount) {
        res.status(400).json({
          error: `Total allocated amount (₹${allocTotal}) cannot exceed the total payment amount (₹${paymentAmount}).`,
        });
        return;
      }
    } else if (validated.invoiceId) {
      targetAllocations = [{ invoiceId: validated.invoiceId, amount: paymentAmount }];
    }

    // 4. Validate Invoices & Prevent Excess Allocation
    const invoiceMap: Record<string, any> = {};
    for (const alloc of targetAllocations) {
      const invoice = await prisma.invoice.findFirst({
        where: { id: alloc.invoiceId, tenantId, customerId: customer.id },
      });

      if (!invoice) {
        res.status(404).json({
          error: `Invoice ${alloc.invoiceId} not found or does not belong to this customer.`,
        });
        return;
      }

      if (invoice.status === 'CANCELLED') {
        res.status(400).json({
          error: `Cannot record payment against cancelled invoice ${invoice.invoiceNumber}.`,
        });
        return;
      }

      if (invoice.status === 'DRAFT') {
        res.status(400).json({
          error: `Cannot record payment against draft invoice ${invoice.invoiceNumber}. Issue the invoice first.`,
        });
        return;
      }

      // PREVENT ALLOCATION EXCEEDING REMAINING BALANCE
      if (alloc.amount > invoice.outstandingAmount) {
        res.status(400).json({
          error: `Allocation of ₹${alloc.amount.toLocaleString('en-IN')} exceeds the remaining balance of ₹${invoice.outstandingAmount.toLocaleString('en-IN')} on invoice ${invoice.invoiceNumber}.`,
        });
        return;
      }

      invoiceMap[alloc.invoiceId] = invoice;
    }

    // 5. Transactional Execution
    const result = await prisma.$transaction(async (tx) => {
      // Allocate sequential payment number
      const paymentCount = await tx.payment.count({ where: { tenantId } });
      const currentYear = new Date().getFullYear();
      const paymentNumber = `PMT-${currentYear}-${String(paymentCount + 1).padStart(4, '0')}`;

      // Create Payment
      const payment = await tx.payment.create({
        data: {
          tenantId,
          customerId: customer.id,
          invoiceId: validated.invoiceId || (targetAllocations.length === 1 ? targetAllocations[0].invoiceId : null),
          paymentNumber,
          paymentDate,
          amount: paymentAmount,
          paymentMethod: validated.paymentMethod,
          transactionReference: validated.transactionReference || null,
          notes: validated.notes || null,
          status: 'SUCCESS',
        },
      });

      // Create allocations and update invoice balances
      for (const alloc of targetAllocations) {
        const inv = invoiceMap[alloc.invoiceId];

        await tx.paymentAllocation.create({
          data: {
            paymentId: payment.id,
            invoiceId: inv.id,
            amount: alloc.amount,
            allocatedAt: paymentDate,
          },
        });

        const newPaidAmount = roundToTwo(inv.paidAmount + alloc.amount);
        const newOutstanding = Math.max(0, roundToTwo(inv.totalAmount - newPaidAmount));
        const newStatus = newOutstanding <= 0 ? 'PAID' : 'PARTIALLY_PAID';
        const newPaymentStatus = newOutstanding <= 0 ? 'PAID' : 'PARTIALLY_PAID';

        await tx.invoice.update({
          where: { id: inv.id },
          data: {
            paidAmount: newPaidAmount,
            outstandingAmount: newOutstanding,
            status: newStatus,
            paymentStatus: newPaymentStatus,
          },
        });
      }

      // Update customer outstanding balance
      await tx.customer.update({
        where: { id: customer.id },
        data: {
          currentOutstanding: {
            decrement: paymentAmount,
          },
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          tenantId,
          userId: req.userId,
          action: 'PAYMENT',
          entityType: 'PAYMENT',
          entityId: payment.id,
          details: `Payment recorded: ${paymentNumber} for ${customer.name} - ₹ ${paymentAmount.toLocaleString('en-IN')} via ${validated.paymentMethod}`,
        },
      });

      return payment;
    });

    res.status(201).json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0]?.message || 'Validation error' });
      return;
    }
    console.error('Payment creation error:', error);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

// POST /api/payments/:id/reverse (Controlled Reversal / Refund Workflow)
router.post('/:id/reverse', authenticate, requireWriteAccess, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const paymentId = req.params.id as string;
    const { reason } = reversePaymentSchema.parse(req.body);

    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, tenantId },
      include: {
        customer: true,
        allocations: { include: { invoice: true } },
      },
    });

    if (!payment) {
      res.status(404).json({ error: 'Payment not found' });
      return;
    }

    if (payment.status === 'REVERSED') {
      res.status(400).json({ error: 'This payment has already been reversed.' });
      return;
    }

    const reversedPayment = await prisma.$transaction(async (tx) => {
      // 1. Reverse each invoice allocation
      for (const alloc of payment.allocations) {
        if (alloc.invoice) {
          const inv = alloc.invoice;
          const restoredPaid = Math.max(0, roundToTwo(inv.paidAmount - alloc.amount));
          const restoredOutstanding = Math.min(inv.totalAmount, roundToTwo(inv.outstandingAmount + alloc.amount));
          const restoredStatus = restoredPaid <= 0 ? 'ISSUED' : 'PARTIALLY_PAID';
          const restoredPaymentStatus = restoredPaid <= 0 ? 'UNPAID' : 'PARTIALLY_PAID';

          await tx.invoice.update({
            where: { id: inv.id },
            data: {
              paidAmount: restoredPaid,
              outstandingAmount: restoredOutstanding,
              status: restoredStatus,
              paymentStatus: restoredPaymentStatus,
            },
          });
        }
      }

      // 2. Re-increment customer currentOutstanding balance
      await tx.customer.update({
        where: { id: payment.customerId },
        data: {
          currentOutstanding: {
            increment: payment.amount,
          },
        },
      });

      // 3. Mark payment as REVERSED (Preserves audit history - no silent deletion)
      const updatedNotes = payment.notes
        ? `${payment.notes}\n[REVERSED on ${new Date().toISOString().split('T')[0]}: ${reason || 'Customer refund/cancellation'}]`
        : `[REVERSED on ${new Date().toISOString().split('T')[0]}: ${reason || 'Customer refund/cancellation'}]`;

      const updated = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'REVERSED',
          notes: updatedNotes,
        },
      });

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          tenantId,
          userId: req.userId,
          action: 'REFUND',
          entityType: 'PAYMENT',
          entityId: payment.id,
          details: `Payment ${payment.paymentNumber} of ₹ ${payment.amount.toLocaleString('en-IN')} was reversed. Reason: ${reason || 'Unspecified'}`,
        },
      });

      return updated;
    });

    res.json({
      message: 'Payment reversed successfully and balances restored.',
      payment: reversedPayment,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0]?.message || 'Validation error' });
      return;
    }
    console.error('Payment reversal error:', error);
    res.status(500).json({ error: 'Failed to reverse payment' });
  }
});

export default router;
