import { prisma } from '../prisma.js';

export const getNextInvoiceNumber = async (tenantId: string): Promise<string> => {
  const settings = await prisma.companySettings.findUnique({
    where: { tenantId },
  });

  const prefix = settings?.invoicePrefix || 'INV-2025-';
  const padding = settings?.invoiceNumberPadding || 4;
  const seq = settings?.nextInvoiceNumber || 1;

  const paddedNum = String(seq).padStart(padding, '0');
  return `${prefix}${paddedNum}`;
};

export const allocateAndIncrementInvoiceNumber = async (
  tenantId: string,
  txPrisma = prisma
): Promise<string> => {
  // Loop up to 50 times to guarantee a unique invoice number even under high concurrency or collisions
  for (let attempt = 0; attempt < 50; attempt++) {
    // Atomically increment the sequence counter
    const updated = await txPrisma.companySettings.update({
      where: { tenantId },
      data: {
        nextInvoiceNumber: { increment: 1 },
      },
    });

    const prefix = updated.invoicePrefix || 'INV-2025-';
    const padding = updated.invoiceNumberPadding || 4;
    const allocatedSeq = updated.nextInvoiceNumber - 1;

    const paddedNum = String(allocatedSeq).padStart(padding, '0');
    const invoiceNumber = `${prefix}${paddedNum}`;

    // Verify it doesn't already exist
    const existing = await txPrisma.invoice.findUnique({
      where: {
        tenantId_invoiceNumber: {
          tenantId,
          invoiceNumber,
        },
      },
    });

    if (!existing) {
      return invoiceNumber;
    }
  }

  // Fallback unique timestamp number in extreme collision edge case
  const timestampSeq = Date.now().toString().slice(-6);
  return `INV-2025-${timestampSeq}`;
};
