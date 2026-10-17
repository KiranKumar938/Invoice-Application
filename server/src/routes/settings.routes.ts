import { Router, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma.js';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth.js';
import { validateGstin, verifyWithGstnPortal } from '../utils/gstValidation.js';
import { runTenantReminderScan } from '../services/reminderService.js';
import { sendNotificationTestEmail } from '../services/emailService.js';

const router = Router();

// Validation Schemas
const hexColorRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const updateSettingsSchema = z.object({
  company: z
    .object({
      name: z.string().min(1, 'Display name cannot be empty').optional(),
      legalName: z.string().min(1, 'Legal name cannot be empty').optional(),
      email: z.string().email('Invalid company email address').optional(),
      phone: z.string().min(5, 'Invalid phone number').optional(),
      website: z.string().optional().nullable(),
      address: z.string().min(3, 'Address is required').optional(),
      city: z.string().min(1, 'City is required').optional(),
      state: z.string().min(1, 'State is required').optional(),
      postalCode: z.string().min(3, 'Postal code is required').optional(),
      country: z.string().optional(),
      gstin: z.string().optional().nullable(),
      pan: z.string().optional().nullable(),
      cin: z.string().optional().nullable(),
      logoUrl: z.string().optional().nullable(),
    })
    .optional(),
  settings: z
    .object({
      // GST
      gstRegisteredState: z.string().optional().nullable(),
      isCompositionScheme: z.boolean().optional(),
      reverseChargeApplicable: z.boolean().optional(),
      eInvoicingEnabled: z.boolean().optional(),
      gstVerificationStatus: z.string().optional(),
      einvoicingGspProvider: z.string().optional().nullable(),

      // Numbering
      invoicePrefix: z.string().min(1, 'Invoice prefix is required').optional(),
      invoiceNumberPadding: z.number().int().min(1).max(10).optional(),
      nextInvoiceNumber: z.number().int().min(1).optional(),
      sequenceResetFrequency: z.enum(['NEVER', 'YEARLY', 'MONTHLY']).optional(),
      numberingFormat: z.string().optional(),

      // Templates & Branding
      templateTheme: z.enum(['MODERN', 'CLASSIC', 'MINIMAL']).optional(),
      primaryColor: z.string().regex(hexColorRegex, 'Invalid hex color code').optional(),
      accentColor: z.string().regex(hexColorRegex, 'Invalid hex color code').optional(),
      showCompanyLogo: z.boolean().optional(),
      showTaxSummary: z.boolean().optional(),
      showPaymentQr: z.boolean().optional(),
      footerText: z.string().optional().nullable(),
      termsAndConditions: z.string().optional().nullable(),
      notes: z.string().optional().nullable(),
      authorizedSignatory: z.string().optional().nullable(),
      signatureUrl: z.string().optional().nullable(),

      // Payment Methods
      bankName: z.string().optional().nullable(),
      accountHolderName: z.string().optional().nullable(),
      bankAccountNumber: z.string().optional().nullable(),
      bankIfsc: z.string().optional().nullable(),
      bankBranch: z.string().optional().nullable(),
      upiId: z.string().optional().nullable(),
      upiQrUrl: z.string().optional().nullable(),
      enableUpi: z.boolean().optional(),
      enableNetBanking: z.boolean().optional(),
      enableCardPayments: z.boolean().optional(),
      enableCash: z.boolean().optional(),
      enableCheque: z.boolean().optional(),
      paymentInstructions: z.string().optional().nullable(),

      // Notifications
      emailNotifications: z.boolean().optional(),
      smsNotifications: z.boolean().optional(),
      paymentReminders: z.boolean().optional(),
      overdueReminders: z.boolean().optional(),
      invoiceSentNotifications: z.boolean().optional(),
      reminderDaysBeforeDue: z.number().int().min(1).max(30).optional(),
      overdueReminderDaysAfterDue: z.number().int().min(1).max(60).optional(),
      smtpHost: z.string().optional().nullable(),
      smtpPort: z.number().int().optional().nullable(),
      smtpUser: z.string().optional().nullable(),
      smtpPassword: z.string().optional().nullable(),
      smtpSecure: z.boolean().optional(),
      smtpSenderEmail: z.string().email().optional().nullable(),
      scheduledJobsActive: z.boolean().optional(),

      // Regional Preferences
      currency: z.string().min(1).optional(),
      currencySymbol: z.string().min(1).optional(),
      dateFormat: z.string().min(1).optional(),
      timeZone: z.string().min(1).optional(),
      defaultPaymentTerms: z.number().int().min(0).max(365).optional(),
      defaultTaxRate: z.number().min(0).max(100).optional(),
      roundOffEnabled: z.boolean().optional(),
    })
    .optional(),
});

// GET /api/settings
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    let [tenant, settings] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: tenantId } }),
      prisma.companySettings.findUnique({ where: { tenantId } }),
    ]);

    if (!tenant) {
      res.status(404).json({ error: 'Tenant workspace not found' });
      return;
    }

    // Auto-initialize CompanySettings if not present
    if (!settings) {
      settings = await prisma.companySettings.create({
        data: {
          tenantId,
          invoicePrefix: 'INV-2025-',
          nextInvoiceNumber: 489,
          invoiceNumberPadding: 4,
          bankName: 'HDFC Bank',
          bankAccountNumber: '50200012345678',
          bankIfsc: 'HDFC0001234',
          bankBranch: 'Dwarka Sector 11, New Delhi',
          upiId: 'klanvision@upi',
          enableUpi: true,
          enableNetBanking: true,
          enableCardPayments: false,
          enableCash: true,
          enableCheque: true,
        },
      });
    }

    const isGstinValid = tenant.gstin ? validateGstin(tenant.gstin).isValid : false;

    res.json({
      company: tenant,
      settings,
      gstVerification: {
        isConfigured: !!tenant.gstin,
        isValidFormat: isGstinValid,
        status: settings.gstVerificationStatus || 'CONFIGURED',
        verifiedTradeName: settings.gstVerifiedTradeName,
        verifiedDate: settings.gstVerifiedDate,
      },
      userRole: req.userRole,
      permissions: {
        canEditSettings: ['OWNER', 'ADMIN'].includes(req.userRole || ''),
        canManageUsers: ['OWNER', 'ADMIN'].includes(req.userRole || ''),
      },
    });
  } catch (error) {
    console.error('Settings fetch error:', error);
    res.status(500).json({ error: 'Failed to retrieve settings' });
  }
});

// PUT /api/settings
router.put('/', authenticate, requireRole(['OWNER', 'ADMIN']), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const validated = updateSettingsSchema.parse(req.body);

    // 1. Company Profile Updates
    if (validated.company) {
      const comp = validated.company;

      // Validate GSTIN if provided
      if (comp.gstin && comp.gstin.trim()) {
        const gstResult = validateGstin(comp.gstin);
        if (!gstResult.isValid) {
          res.status(400).json({ error: gstResult.error });
          return;
        }
      }

      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          name: comp.name,
          legalName: comp.legalName,
          email: comp.email,
          phone: comp.phone,
          website: comp.website,
          address: comp.address,
          city: comp.city,
          state: comp.state,
          postalCode: comp.postalCode,
          country: comp.country || 'India',
          gstin: comp.gstin ? comp.gstin.trim().toUpperCase() : undefined,
          pan: comp.pan ? comp.pan.trim().toUpperCase() : undefined,
          cin: comp.cin ? comp.cin.trim().toUpperCase() : undefined,
          logoUrl: comp.logoUrl,
        },
      });
    }

    // 2. Settings Updates
    if (validated.settings) {
      const sett = validated.settings;

      // Safe Invoice Numbering Validation: Check for collision or unintentional backward sequence reset
      if (sett.nextInvoiceNumber !== undefined || sett.invoicePrefix !== undefined) {
        const currentSettings = await prisma.companySettings.findUnique({ where: { tenantId } });
        const prefixToCheck = sett.invoicePrefix || currentSettings?.invoicePrefix || 'INV-2025-';
        const nextNumToCheck = sett.nextInvoiceNumber ?? currentSettings?.nextInvoiceNumber ?? 1;

        // Query all existing invoices for this tenant with that prefix
        const existingInvoices = await prisma.invoice.findMany({
          where: {
            tenantId,
            invoiceNumber: { startsWith: prefixToCheck },
          },
          select: { invoiceNumber: true },
        });

        if (existingInvoices.length > 0) {
          // Extract maximum numeric sequence from existing invoices
          let maxExistingSeq = 0;
          for (const inv of existingInvoices) {
            const numPart = inv.invoiceNumber.replace(prefixToCheck, '');
            const parsed = parseInt(numPart, 10);
            if (!isNaN(parsed) && parsed > maxExistingSeq) {
              maxExistingSeq = parsed;
            }
          }

          // If user attempts to set next sequence number <= highest existing sequence, reject to prevent duplicates
          if (nextNumToCheck <= maxExistingSeq) {
            res.status(400).json({
              error: `Invalid Sequence: An invoice with number '${prefixToCheck}${String(maxExistingSeq).padStart(sett.invoiceNumberPadding || currentSettings?.invoiceNumberPadding || 4, '0')}' already exists in your workspace. Next invoice number must be greater than ${maxExistingSeq} to prevent duplicate invoices.`,
            });
            return;
          }
        }
      }

      // Bank IFSC Format validation if provided
      if (sett.bankIfsc && sett.bankIfsc.trim()) {
        const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
        if (!ifscRegex.test(sett.bankIfsc.trim().toUpperCase())) {
          res.status(400).json({
            error: 'Invalid IFSC Code format. Must be 11 characters: 4 letters, 0, and 6 alphanumeric characters (e.g., HDFC0001234).',
          });
          return;
        }
      }

      await prisma.companySettings.upsert({
        where: { tenantId },
        update: {
          ...sett,
          bankIfsc: sett.bankIfsc ? sett.bankIfsc.trim().toUpperCase() : undefined,
        },
        create: {
          tenantId,
          ...sett,
          bankIfsc: sett.bankIfsc ? sett.bankIfsc.trim().toUpperCase() : undefined,
        },
      });
    }

    // Record audit trail
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: req.userId,
        action: 'UPDATE',
        entityType: 'SETTINGS',
        details: 'Settings updated across company preferences and configuration',
      },
    });

    res.json({ message: 'Settings saved and applied successfully' });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0]?.message || 'Validation error' });
      return;
    }
    console.error('Settings update error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// POST /api/settings/gst/verify
router.post('/gst/verify', authenticate, requireRole(['OWNER', 'ADMIN']), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const { gstin } = req.body;

    if (!gstin) {
      res.status(400).json({ error: 'GSTIN is required for verification' });
      return;
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      res.status(404).json({ error: 'Tenant workspace not found' });
      return;
    }

    const result = verifyWithGstnPortal(gstin, tenant.legalName || tenant.name);

    if (!result.verified) {
      res.status(400).json({ error: result.error });
      return;
    }

    // Update CompanySettings with verified status
    await prisma.companySettings.upsert({
      where: { tenantId },
      update: {
        gstVerificationStatus: 'GOVT_VERIFIED',
        gstVerifiedTradeName: result.tradeName,
        gstVerifiedDate: new Date(),
        gstRegisteredState: `${(result.stateJurisdiction || 'Delhi').split(' - ')[0]} (${gstin.slice(0, 2)})`,
      },
      create: {
        tenantId,
        gstVerificationStatus: 'GOVT_VERIFIED',
        gstVerifiedTradeName: result.tradeName,
        gstVerifiedDate: new Date(),
        gstRegisteredState: `${(result.stateJurisdiction || 'Delhi').split(' - ')[0]} (${gstin.slice(0, 2)})`,
      },
    });

    // Also update tenant's gstin
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        gstin: result.gstin,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: req.userId,
        action: 'UPDATE',
        entityType: 'SETTINGS',
        details: `GSTIN ${result.gstin} verified with government portal sandbox`,
      },
    });

    res.json({
      message: 'GSTIN successfully verified against GSTN portal records',
      details: result,
    });
  } catch (error) {
    console.error('GST verify error:', error);
    res.status(500).json({ error: 'Failed to verify GSTIN' });
  }
});

// POST /api/settings/notifications/test-email
router.post('/notifications/test-email', authenticate, requireRole(['OWNER', 'ADMIN']), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const { targetEmail } = req.body;

    const [tenant, settings, user] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: tenantId } }),
      prisma.companySettings.findUnique({ where: { tenantId } }),
      prisma.user.findUnique({ where: { id: req.userId } }),
    ]);

    const recipient = targetEmail || user?.email || tenant?.email;
    if (!recipient) {
      res.status(400).json({ error: 'A recipient email address is required' });
      return;
    }

    const delivery = await sendNotificationTestEmail(recipient, tenant?.name || 'Klanvision Billing', {
      host: settings?.smtpHost || 'smtp.mailgun.org',
      port: settings?.smtpPort || 587,
      senderEmail: settings?.smtpSenderEmail || 'billing@klanvision.com',
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: req.userId,
        action: 'CREATE',
        entityType: 'SETTINGS',
        details: `Dispatched notification test email to ${recipient}`,
      },
    });

    res.json({
      message: `Test email successfully dispatched to ${recipient}`,
      delivery,
    });
  } catch (error) {
    console.error('Notification test email error:', error);
    res.status(500).json({ error: 'Failed to dispatch test verification email' });
  }
});

// POST /api/settings/notifications/trigger-reminders
router.post('/notifications/trigger-reminders', authenticate, requireRole(['OWNER', 'ADMIN']), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const scanResult = await runTenantReminderScan(tenantId);

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: req.userId,
        action: 'CREATE',
        entityType: 'SETTINGS',
        details: `Triggered payment & overdue reminders job: ${scanResult.totalProcessed} notifications generated`,
      },
    });

    res.json({
      message: `Reminder scan completed. ${scanResult.upcomingRemindersSent} upcoming payment reminder(s) and ${scanResult.overdueRemindersSent} overdue escalation notification(s) generated.`,
      result: scanResult,
    });
  } catch (error) {
    console.error('Reminder scan error:', error);
    res.status(500).json({ error: 'Failed to run scheduled reminder scan' });
  }
});

// GET /api/settings/users
router.get('/users', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const [memberships, pendingInvites] = await Promise.all([
      prisma.membership.findMany({
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
              isActive: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.tenantInvite.findMany({
        where: { tenantId, status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const activeUsers = memberships.map((m) => ({
      ...m.user,
      role: m.role,
      isCurrentUser: m.userId === req.userId,
      status: m.user.isActive ? 'ACTIVE' : 'INACTIVE',
    }));

    res.json({
      users: activeUsers,
      pendingInvites,
      currentUserRole: req.userRole,
    });
  } catch (error) {
    console.error('Settings users error:', error);
    res.status(500).json({ error: 'Failed to fetch team users' });
  }
});

// POST /api/settings/users/invite
router.post('/users/invite', authenticate, requireRole(['OWNER', 'ADMIN']), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const { email, name, role } = req.body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      res.status(400).json({ error: 'A valid email address is required' });
      return;
    }

    const assignedRole = (role || 'VIEWER').toUpperCase();
    if (!['OWNER', 'ADMIN', 'ACCOUNTANT', 'VIEWER'].includes(assignedRole)) {
      res.status(400).json({ error: 'Invalid role. Must be OWNER, ADMIN, ACCOUNTANT, or VIEWER' });
      return;
    }

    // Only OWNER can invite another OWNER
    if (assignedRole === 'OWNER' && req.userRole !== 'OWNER') {
      res.status(403).json({ error: 'Only workspace Owners can invite new Owners' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (user) {
      // Check if already a member of this tenant
      const existingMembership = await prisma.membership.findUnique({
        where: {
          userId_tenantId: {
            userId: user.id,
            tenantId,
          },
        },
      });

      if (existingMembership) {
        res.status(400).json({ error: 'User is already an active member of this workspace' });
        return;
      }

      // Add user to workspace
      await prisma.membership.create({
        data: {
          userId: user.id,
          tenantId,
          role: assignedRole,
          isDefault: false,
        },
      });
    } else {
      // Create user and membership
      const defaultPasswordHash = await bcrypt.hash('Klanvision@2025', 10);
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          name: name?.trim() || normalizedEmail.split('@')[0],
          passwordHash: defaultPasswordHash,
          role: assignedRole,
          memberships: {
            create: {
              tenantId,
              role: assignedRole,
              isDefault: true,
            },
          },
        },
      });

      // Record invitation token
      await prisma.tenantInvite.create({
        data: {
          tenantId,
          email: normalizedEmail,
          name: name?.trim() || normalizedEmail.split('@')[0],
          role: assignedRole,
          status: 'ACCEPTED',
          invitedBy: req.userId,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: req.userId,
        action: 'CREATE',
        entityType: 'SETTINGS',
        details: `Invited user ${normalizedEmail} with role ${assignedRole}`,
      },
    });

    res.status(201).json({
      message: `Team member ${normalizedEmail} successfully added with role ${assignedRole}`,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: assignedRole,
      },
    });
  } catch (error) {
    console.error('Invite user error:', error);
    res.status(500).json({ error: 'Failed to invite team member' });
  }
});

// PUT /api/settings/users/:userId/role
router.put('/users/:userId/role', authenticate, requireRole(['OWNER', 'ADMIN']), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const targetUserId = Array.isArray(req.params.userId) ? req.params.userId[0] : (req.params.userId as string);
    const { role } = req.body;

    const newRole = (role || '').toUpperCase();
    if (!['OWNER', 'ADMIN', 'ACCOUNTANT', 'VIEWER'].includes(newRole)) {
      res.status(400).json({ error: 'Invalid role. Must be OWNER, ADMIN, ACCOUNTANT, or VIEWER' });
      return;
    }

    const targetMembership = await prisma.membership.findUnique({
      where: {
        userId_tenantId: {
          userId: targetUserId,
          tenantId,
        },
      },
    });

    if (!targetMembership) {
      res.status(404).json({ error: 'Team member not found in this workspace' });
      return;
    }

    // Role modification safety guards:
    // 1. Only an OWNER can promote someone to OWNER or modify an existing OWNER
    if ((newRole === 'OWNER' || targetMembership.role === 'OWNER') && req.userRole !== 'OWNER') {
      res.status(403).json({ error: 'Only workspace Owners can modify Owner permissions' });
      return;
    }

    // 2. Prevent removing the last OWNER of the workspace
    if (targetMembership.role === 'OWNER' && newRole !== 'OWNER') {
      const ownerCount = await prisma.membership.count({
        where: { tenantId, role: 'OWNER' },
      });
      if (ownerCount <= 1) {
        res.status(400).json({
          error: 'Cannot demote the last Owner of the workspace. Promote another member to Owner first.',
        });
        return;
      }
    }

    const updated = await prisma.membership.update({
      where: {
        userId_tenantId: {
          userId: targetUserId,
          tenantId,
        },
      },
      data: { role: newRole },
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: req.userId,
        action: 'UPDATE',
        entityType: 'SETTINGS',
        details: `Updated role for user ${targetUserId} to ${newRole}`,
      },
    });

    res.json({ message: 'User role updated successfully', membership: updated });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// DELETE /api/settings/users/:userId
router.delete('/users/:userId', authenticate, requireRole(['OWNER', 'ADMIN']), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const targetUserId = Array.isArray(req.params.userId) ? req.params.userId[0] : (req.params.userId as string);

    // Safety Guard 1: Prevent revoking yourself
    if (targetUserId === req.userId) {
      res.status(400).json({ error: 'You cannot revoke your own workspace access' });
      return;
    }

    const targetMembership = await prisma.membership.findUnique({
      where: {
        userId_tenantId: {
          userId: targetUserId,
          tenantId,
        },
      },
    });

    if (!targetMembership) {
      res.status(404).json({ error: 'Team member not found in this workspace' });
      return;
    }

    // Safety Guard 2: Only OWNER can revoke an OWNER
    if (targetMembership.role === 'OWNER' && req.userRole !== 'OWNER') {
      res.status(403).json({ error: 'Only workspace Owners can revoke an Owner membership' });
      return;
    }

    // Safety Guard 3: Prevent revoking the last OWNER
    if (targetMembership.role === 'OWNER') {
      const ownerCount = await prisma.membership.count({
        where: { tenantId, role: 'OWNER' },
      });
      if (ownerCount <= 1) {
        res.status(400).json({
          error: 'Cannot remove the last Owner of the workspace.',
        });
        return;
      }
    }

    await prisma.membership.delete({
      where: {
        userId_tenantId: {
          userId: targetUserId,
          tenantId,
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: req.userId,
        action: 'DELETE',
        entityType: 'SETTINGS',
        details: `Revoked access for user ${targetUserId}`,
      },
    });

    res.json({ message: 'User access revoked successfully' });
  } catch (error) {
    console.error('Revoke user error:', error);
    res.status(500).json({ error: 'Failed to revoke user access' });
  }
});

// DELETE /api/settings/invites/:inviteId
router.delete('/invites/:inviteId', authenticate, requireRole(['OWNER', 'ADMIN']), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const inviteId = Array.isArray(req.params.inviteId) ? req.params.inviteId[0] : (req.params.inviteId as string);

    await prisma.tenantInvite.deleteMany({
      where: { id: inviteId, tenantId },
    });

    res.json({ message: 'Invitation cancelled successfully' });
  } catch (error) {
    console.error('Delete invite error:', error);
    res.status(500).json({ error: 'Failed to cancel invitation' });
  }
});

export default router;
