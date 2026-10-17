import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { authenticate } from '../middleware/auth.js';
import { roundToTwo } from '../services/gstCalculator.js';
const router = Router();
const paymentSchema = z.object({
    customerId: z.string().min(1, 'Customer is required'),
    invoiceId: z.string().optional().nullable(),
    amount: z.number().min(1, 'Amount must be greater than 0'),
    paymentDate: z.string().or(z.date()).default(() => new Date()),
    paymentMethod: z.enum(['UPI', 'BANK_TRANSFER', 'CASH', 'CARD', 'CHEQUE']).default('BANK_TRANSFER'),
    transactionReference: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
});
// GET /api/payments
router.get('/', authenticate, async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const search = req.query.search?.trim().toLowerCase() || '';
        const payments = await prisma.payment.findMany({
            where: {
                tenantId,
                ...(search
                    ? {
                        OR: [
                            { paymentNumber: { contains: search } },
                            { transactionReference: { contains: search } },
                            { customer: { name: { contains: search } } },
                        ],
                    }
                    : {}),
            },
            include: {
                customer: { select: { id: true, name: true, email: true } },
                invoice: { select: { id: true, invoiceNumber: true, totalAmount: true } },
            },
            orderBy: { paymentDate: 'desc' },
        });
        res.json(payments);
    }
    catch (error) {
        console.error('Payment fetch error:', error);
        res.status(500).json({ error: 'Failed to retrieve payments' });
    }
});
// POST /api/payments
router.post('/', authenticate, async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const validated = paymentSchema.parse(req.body);
        const paymentAmount = roundToTwo(validated.amount);
        const result = await prisma.$transaction(async (tx) => {
            // 1. Generate payment number
            const paymentCount = await tx.payment.count({ where: { tenantId } });
            const paymentNumber = `PMT-${new Date().getFullYear()}-${String(paymentCount + 1).padStart(4, '0')}`;
            // 2. Create payment record
            const payment = await tx.payment.create({
                data: {
                    tenantId,
                    customerId: validated.customerId,
                    invoiceId: validated.invoiceId || null,
                    paymentNumber,
                    paymentDate: new Date(validated.paymentDate),
                    amount: paymentAmount,
                    paymentMethod: validated.paymentMethod,
                    transactionReference: validated.transactionReference || null,
                    notes: validated.notes || null,
                    status: 'SUCCESS',
                },
            });
            // 3. If tied to an invoice, allocate and update invoice balance
            if (validated.invoiceId) {
                const invoice = await tx.invoice.findFirst({
                    where: { id: validated.invoiceId, tenantId },
                });
                if (invoice) {
                    await tx.paymentAllocation.create({
                        data: {
                            paymentId: payment.id,
                            invoiceId: invoice.id,
                            amount: paymentAmount,
                        },
                    });
                    const newPaidAmount = roundToTwo(invoice.paidAmount + paymentAmount);
                    const newOutstanding = Math.max(0, roundToTwo(invoice.totalAmount - newPaidAmount));
                    const newStatus = newOutstanding <= 0 ? 'PAID' : 'PARTIALLY_PAID';
                    const newPaymentStatus = newOutstanding <= 0 ? 'PAID' : 'PARTIALLY_PAID';
                    await tx.invoice.update({
                        where: { id: invoice.id },
                        data: {
                            paidAmount: newPaidAmount,
                            outstandingAmount: newOutstanding,
                            status: newStatus,
                            paymentStatus: newPaymentStatus,
                        },
                    });
                }
            }
            // 4. Reduce customer outstanding balance
            await tx.customer.update({
                where: { id: validated.customerId },
                data: {
                    currentOutstanding: {
                        decrement: paymentAmount,
                    },
                },
            });
            // 5. Audit Log
            await tx.auditLog.create({
                data: {
                    tenantId,
                    userId: req.userId,
                    action: 'PAYMENT',
                    entityType: 'PAYMENT',
                    entityId: payment.id,
                    details: `Payment recorded: ${paymentNumber} - ₹ ${paymentAmount.toLocaleString('en-IN')}`,
                },
            });
            return payment;
        });
        res.status(201).json(result);
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: error.errors[0]?.message || 'Validation error' });
            return;
        }
        console.error('Payment create error:', error);
        res.status(500).json({ error: 'Failed to record payment' });
    }
});
export default router;
