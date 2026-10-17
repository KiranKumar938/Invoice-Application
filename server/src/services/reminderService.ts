import { prisma } from '../prisma.js';

export interface ReminderJobResult {
  tenantId: string;
  upcomingRemindersSent: number;
  overdueRemindersSent: number;
  totalProcessed: number;
  notifications: Array<{
    invoiceId: string;
    invoiceNumber: string;
    customerName: string;
    type: string;
    message: string;
  }>;
  executedAt: string;
}

export const runTenantReminderScan = async (tenantId: string): Promise<ReminderJobResult> => {
  const settings = await prisma.companySettings.findUnique({
    where: { tenantId },
  });

  const reminderDaysBefore = settings?.reminderDaysBeforeDue ?? 3;
  const overdueDaysAfter = settings?.overdueReminderDaysAfterDue ?? 7;

  const now = new Date();

  // Target window for upcoming payment reminder (e.g., today + 3 days)
  const upcomingTargetDate = new Date();
  upcomingTargetDate.setDate(now.getDate() + reminderDaysBefore);
  const upcomingStart = new Date(upcomingTargetDate.setHours(0, 0, 0, 0));
  const upcomingEnd = new Date(upcomingTargetDate.setHours(23, 59, 59, 999));

  // Invoices approaching due date
  const upcomingInvoices = await prisma.invoice.findMany({
    where: {
      tenantId,
      status: { in: ['ISSUED', 'PARTIALLY_PAID'] },
      dueDate: {
        gte: upcomingStart,
        lte: upcomingEnd,
      },
      totalAmount: { gt: prisma.invoice.fields.paidAmount },
    },
    include: {
      customer: true,
    },
  });

  // Target threshold for overdue escalation (due date older than X days)
  const overdueCutoff = new Date();
  overdueCutoff.setDate(now.getDate() - overdueDaysAfter);

  const overdueInvoices = await prisma.invoice.findMany({
    where: {
      tenantId,
      status: { in: ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'] },
      dueDate: {
        lt: overdueCutoff,
      },
      totalAmount: { gt: prisma.invoice.fields.paidAmount },
    },
    include: {
      customer: true,
    },
  });

  const createdNotifications: Array<{
    invoiceId: string;
    invoiceNumber: string;
    customerName: string;
    type: string;
    message: string;
  }> = [];

  // Create notifications for upcoming reminders if enabled
  if (settings?.paymentReminders !== false) {
    for (const inv of upcomingInvoices) {
      const remaining = inv.totalAmount - inv.paidAmount;
      const message = `Payment reminder: Invoice ${inv.invoiceNumber} for ${inv.customer.name} of ₹${remaining.toFixed(2)} is due in ${reminderDaysBefore} day(s) on ${inv.dueDate.toISOString().split('T')[0]}.`;
      
      await prisma.notification.create({
        data: {
          tenantId,
          title: `Upcoming Payment Due: ${inv.invoiceNumber}`,
          message,
          type: 'INFO',
          link: `/invoices/${inv.id}`,
        },
      });

      createdNotifications.push({
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.customer.name,
        type: 'UPCOMING_DUE',
        message,
      });
    }
  }

  // Create notifications for overdue invoices if enabled
  if (settings?.overdueReminders !== false) {
    for (const inv of overdueInvoices) {
      const remaining = inv.totalAmount - inv.paidAmount;
      const daysOverdue = Math.floor((now.getTime() - inv.dueDate.getTime()) / (1000 * 60 * 60 * 24));
      const message = `Overdue notice: Invoice ${inv.invoiceNumber} for ${inv.customer.name} is overdue by ${daysOverdue} days (Outstanding: ₹${remaining.toFixed(2)}).`;

      await prisma.notification.create({
        data: {
          tenantId,
          title: `Overdue Invoice Escalation: ${inv.invoiceNumber}`,
          message,
          type: 'WARNING',
          link: `/invoices/${inv.id}`,
        },
      });

      createdNotifications.push({
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.customer.name,
        type: 'OVERDUE_ESCALATION',
        message,
      });
    }
  }

  // Update last run time in CompanySettings
  await prisma.companySettings.update({
    where: { tenantId },
    data: {
      lastReminderJobRunAt: new Date(),
    },
  });

  return {
    tenantId,
    upcomingRemindersSent: upcomingInvoices.length,
    overdueRemindersSent: overdueInvoices.length,
    totalProcessed: createdNotifications.length,
    notifications: createdNotifications,
    executedAt: new Date().toISOString(),
  };
};
