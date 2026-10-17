import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { authenticate } from '../middleware/auth.js';
import { calculateInvoiceFinancials, isSupplyInterState, } from '../services/gstCalculator.js';
import { getNextInvoiceNumber, allocateAndIncrementInvoiceNumber, } from '../services/invoiceNumberService.js';
const router = Router();
const lineItemSchema = z.object({
    productId: z.string().optional().nullable(),
    description: z.string().min(1, 'Description is required'),
    hsnSacCode: z.string().default('998314'),
    quantity: z.number().min(0.01, 'Quantity must be greater than 0'),
    unitPrice: z.number().min(0, 'Price must be positive'),
    discountPercent: z.number().min(0).max(100).default(0),
    gstRate: z.number().min(0).max(100).default(18),
});
const invoiceCreateSchema = z.object({
    customerId: z.string().min(1, 'Customer is required'),
    issueDate: z.string().or(z.date()),
    dueDate: z.string().or(z.date()),
    status: z.enum(['DRAFT', 'ISSUED']).default('ISSUED'),
    notes: z.string().optional().nullable(),
    terms: z.string().optional().nullable(),
    lineItems: z.array(lineItemSchema).min(1, 'At least one line item is required'),
});
// GET /api/invoices/next-number
router.get('/next-number', authenticate, async (req, res) => {
    try {
        const nextNumber = await getNextInvoiceNumber(req.tenantId);
        res.json({ nextInvoiceNumber: nextNumber });
    }
    catch (error) {
        console.error('Error fetching next invoice number:', error);
        res.status(500).json({ error: 'Failed to preview next invoice number' });
    }
});
// GET /api/invoices
router.get('/', authenticate, async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const search = req.query.search?.trim().toLowerCase() || '';
        const status = req.query.status || '';
        const customerId = req.query.customerId || '';
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const where = { tenantId };
        if (search) {
            where.OR = [
                { invoiceNumber: { contains: search } },
                { customer: { name: { contains: search } } },
            ];
        }
        if (status && status !== 'ALL') {
            where.status = status;
        }
        if (customerId) {
            where.customerId = customerId;
        }
        const [totalCount, invoices] = await Promise.all([
            prisma.invoice.count({ where }),
            prisma.invoice.findMany({
                where,
                include: {
                    customer: {
                        select: { id: true, name: true, email: true, phone: true, gstin: true },
                    },
                    lineItems: true,
                    payments: {
                        select: { id: true, amount: true, paymentDate: true, paymentMethod: true },
                    },
                },
                orderBy: { issueDate: 'desc' },
                skip,
                take: limit,
            }),
        ]);
        // Check overdue statuses dynamically if due date is passed and not paid
        const now = new Date();
        const formattedInvoices = invoices.map((inv) => {
            let currentStatus = inv.status;
            if (currentStatus !== 'PAID' && currentStatus !== 'CANCELLED' && new Date(inv.dueDate) < now) {
                if (inv.outstandingAmount > 0) {
                    currentStatus = 'OVERDUE';
                }
            }
            return {
                ...inv,
                status: currentStatus,
            };
        });
        res.json({
            invoices: formattedInvoices,
            pagination: {
                page,
                limit,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limit) || 1,
            },
        });
    }
    catch (error) {
        console.error('Invoice fetch error:', error);
        res.status(500).json({ error: 'Failed to retrieve invoices' });
    }
});
// GET /api/invoices/:id
router.get('/:id', authenticate, async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const invoiceId = req.params.id;
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
    }
    catch (error) {
        console.error('Invoice get error:', error);
        res.status(500).json({ error: 'Failed to retrieve invoice' });
    }
});
// POST /api/invoices
router.post('/', authenticate, async (req, res) => {
    try {
        const tenantId = req.tenantId;
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
        // Determine GST supply type: Intra-State vs Inter-State
        const isInterState = isSupplyInterState(tenant.state, customer.billingState);
        // Calculate financials strictly on server with safe arithmetic
        const calcInput = validated.lineItems.map((item) => ({
            description: item.description,
            hsnSacCode: item.hsnSacCode,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountPercent: item.discountPercent,
            gstRate: item.gstRate,
            productId: item.productId || undefined,
        }));
        const roundOffEnabled = settings?.roundOffEnabled ?? true;
        const calcResult = calculateInvoiceFinancials(calcInput, isInterState, roundOffEnabled);
        // Create Invoice Transactionally
        const createdInvoice = await prisma.$transaction(async (tx) => {
            // 1. Allocate sequence invoice number
            const invoiceNumber = await allocateAndIncrementInvoiceNumber(tenantId, tx);
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
                    outstandingAmount: calcResult.totalAmount,
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
                    details: `Invoice created: ${inv.invoiceNumber} for ${customer.name} - ₹ ${inv.totalAmount.toLocaleString('en-IN')}`,
                },
            });
            return inv;
        });
        res.status(201).json(createdInvoice);
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: error.errors[0]?.message || 'Validation error' });
            return;
        }
        console.error('Invoice creation error:', error);
        res.status(500).json({ error: 'Failed to create invoice' });
    }
});
// POST /api/invoices/:id/cancel
router.post('/:id/cancel', authenticate, async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const invoiceId = req.params.id;
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
    }
    catch (error) {
        console.error('Invoice cancel error:', error);
        res.status(500).json({ error: 'Failed to cancel invoice' });
    }
});
export default router;
