import { Router } from 'express';
import { prisma } from '../prisma.js';
import { authenticate } from '../middleware/auth.js';
const router = Router();
// GET /api/settings
router.get('/', authenticate, async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const [tenant, settings] = await Promise.all([
            prisma.tenant.findUnique({ where: { id: tenantId } }),
            prisma.companySettings.findUnique({ where: { tenantId } }),
        ]);
        if (!tenant) {
            res.status(404).json({ error: 'Tenant not found' });
            return;
        }
        res.json({
            company: tenant,
            settings: settings || {},
        });
    }
    catch (error) {
        console.error('Settings fetch error:', error);
        res.status(500).json({ error: 'Failed to retrieve settings' });
    }
});
// PUT /api/settings
router.put('/', authenticate, async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { company, settings } = req.body;
        if (company) {
            await prisma.tenant.update({
                where: { id: tenantId },
                data: {
                    name: company.name,
                    legalName: company.legalName,
                    email: company.email,
                    phone: company.phone,
                    website: company.website,
                    address: company.address,
                    city: company.city,
                    state: company.state,
                    postalCode: company.postalCode,
                    gstin: company.gstin,
                },
            });
        }
        if (settings) {
            await prisma.companySettings.upsert({
                where: { tenantId },
                update: {
                    invoicePrefix: settings.invoicePrefix,
                    nextInvoiceNumber: settings.nextInvoiceNumber ? parseInt(settings.nextInvoiceNumber, 10) : undefined,
                    enableUpi: settings.enableUpi,
                    enableNetBanking: settings.enableNetBanking,
                    enableCardPayments: settings.enableCardPayments,
                    upiId: settings.upiId,
                    bankName: settings.bankName,
                    bankAccountNumber: settings.bankAccountNumber,
                    bankIfsc: settings.bankIfsc,
                    emailNotifications: settings.emailNotifications,
                    smsNotifications: settings.smsNotifications,
                    paymentReminders: settings.paymentReminders,
                    termsAndConditions: settings.termsAndConditions,
                    notes: settings.notes,
                },
                create: {
                    tenantId,
                    invoicePrefix: settings.invoicePrefix || 'INV-2025-',
                    nextInvoiceNumber: settings.nextInvoiceNumber ? parseInt(settings.nextInvoiceNumber, 10) : 489,
                    enableUpi: settings.enableUpi ?? true,
                    enableNetBanking: settings.enableNetBanking ?? true,
                    enableCardPayments: settings.enableCardPayments ?? false,
                    upiId: settings.upiId || 'klanvision@upi',
                    emailNotifications: settings.emailNotifications ?? true,
                    smsNotifications: settings.smsNotifications ?? true,
                    paymentReminders: settings.paymentReminders ?? true,
                },
            });
        }
        await prisma.auditLog.create({
            data: {
                tenantId,
                userId: req.userId,
                action: 'UPDATE',
                entityType: 'SETTINGS',
                details: 'Settings updated: Company details & GST information',
            },
        });
        res.json({ message: 'Settings saved successfully' });
    }
    catch (error) {
        console.error('Settings update error:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});
// GET /api/settings/users
router.get('/users', authenticate, async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const memberships = await prisma.membership.findMany({
            where: { tenantId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        avatarUrl: true,
                        createdAt: true,
                    },
                },
            },
        });
        const users = memberships.map((m) => ({
            ...m.user,
            role: m.role,
        }));
        res.json(users);
    }
    catch (error) {
        console.error('Settings users error:', error);
        res.status(500).json({ error: 'Failed to fetch team users' });
    }
});
export default router;
