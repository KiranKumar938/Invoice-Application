import { prisma } from '../prisma.js';
export const getNextInvoiceNumber = async (tenantId) => {
    const settings = await prisma.companySettings.findUnique({
        where: { tenantId },
    });
    const prefix = settings?.invoicePrefix || 'INV-2025-';
    const padding = settings?.invoiceNumberPadding || 4;
    const seq = settings?.nextInvoiceNumber || 1;
    const paddedNum = String(seq).padStart(padding, '0');
    return `${prefix}${paddedNum}`;
};
export const allocateAndIncrementInvoiceNumber = async (tenantId, txPrisma = prisma) => {
    const settings = await txPrisma.companySettings.findUnique({
        where: { tenantId },
    });
    if (!settings) {
        throw new Error('Tenant settings not found for invoice number allocation');
    }
    const prefix = settings.invoicePrefix || 'INV-2025-';
    const padding = settings.invoiceNumberPadding || 4;
    const currentSeq = settings.nextInvoiceNumber || 1;
    const paddedNum = String(currentSeq).padStart(padding, '0');
    const invoiceNumber = `${prefix}${paddedNum}`;
    // Check if invoice number already exists
    const existing = await txPrisma.invoice.findUnique({
        where: {
            tenantId_invoiceNumber: {
                tenantId,
                invoiceNumber,
            },
        },
    });
    if (existing) {
        // If collides, increment and recurse
        await txPrisma.companySettings.update({
            where: { tenantId },
            data: { nextInvoiceNumber: currentSeq + 1 },
        });
        return allocateAndIncrementInvoiceNumber(tenantId, txPrisma);
    }
    // Increment sequence for next invoice
    await txPrisma.companySettings.update({
        where: { tenantId },
        data: { nextInvoiceNumber: currentSeq + 1 },
    });
    return invoiceNumber;
};
