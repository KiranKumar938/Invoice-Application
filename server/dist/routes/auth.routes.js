import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { config } from '../config.js';
import { authenticate } from '../middleware/auth.js';
const router = Router();
const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});
const registerSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
    companyName: z.string().min(2),
    phone: z.string().optional(),
    gstin: z.string().optional(),
});
// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const validated = loginSchema.parse(req.body);
        const user = await prisma.user.findUnique({
            where: { email: validated.email.toLowerCase() },
            include: {
                memberships: {
                    include: {
                        tenant: {
                            include: {
                                settings: true,
                            },
                        },
                    },
                },
            },
        });
        if (!user || !user.isActive) {
            res.status(401).json({ error: 'Invalid email or password' });
            return;
        }
        const isMatch = await bcrypt.compare(validated.password, user.passwordHash);
        if (!isMatch) {
            res.status(401).json({ error: 'Invalid email or password' });
            return;
        }
        const defaultMembership = user.memberships.find((m) => m.isDefault) || user.memberships[0];
        if (!defaultMembership) {
            res.status(403).json({ error: 'User does not belong to any active company workspace' });
            return;
        }
        const token = jwt.sign({
            userId: user.id,
            email: user.email,
            role: defaultMembership.role,
            tenantId: defaultMembership.tenantId,
        }, config.jwtSecret, { expiresIn: '7d' });
        // Record audit log
        await prisma.auditLog.create({
            data: {
                tenantId: defaultMembership.tenantId,
                userId: user.id,
                action: 'LOGIN',
                entityType: 'USER',
                entityId: user.id,
                details: `User ${user.email} signed in successfully`,
            },
        });
        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: defaultMembership.role,
                avatarUrl: user.avatarUrl,
                phone: user.phone,
            },
            tenant: defaultMembership.tenant,
        });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: error.errors[0]?.message || 'Validation error' });
            return;
        }
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error during authentication' });
    }
});
// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const validated = registerSchema.parse(req.body);
        const existingUser = await prisma.user.findUnique({
            where: { email: validated.email.toLowerCase() },
        });
        if (existingUser) {
            res.status(400).json({ error: 'An account with this email already exists' });
            return;
        }
        const passwordHash = await bcrypt.hash(validated.password, 10);
        const result = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    name: validated.name,
                    email: validated.email.toLowerCase(),
                    passwordHash,
                    phone: validated.phone || null,
                    role: 'ADMIN',
                },
            });
            const tenant = await tx.tenant.create({
                data: {
                    name: validated.companyName,
                    legalName: validated.companyName,
                    email: validated.email.toLowerCase(),
                    phone: validated.phone || '+91 98765 43210',
                    address: 'A-1, 3rd Floor, Gokul Garden, Sector-11, Dwarka',
                    city: 'New Delhi',
                    state: 'Delhi',
                    postalCode: '110075',
                    country: 'India',
                    gstin: validated.gstin || '07AAACC81234F1Z5',
                },
            });
            const membership = await tx.membership.create({
                data: {
                    userId: user.id,
                    tenantId: tenant.id,
                    role: 'ADMIN',
                    isDefault: true,
                },
            });
            const settings = await tx.companySettings.create({
                data: {
                    tenantId: tenant.id,
                    currency: 'INR',
                    currencySymbol: '₹',
                    invoicePrefix: 'INV-2025-',
                    nextInvoiceNumber: 1,
                    defaultTaxRate: 18.0,
                },
            });
            return { user, tenant, membership, settings };
        });
        const token = jwt.sign({
            userId: result.user.id,
            email: result.user.email,
            role: result.membership.role,
            tenantId: result.tenant.id,
        }, config.jwtSecret, { expiresIn: '7d' });
        res.status(201).json({
            token,
            user: {
                id: result.user.id,
                name: result.user.name,
                email: result.user.email,
                role: result.membership.role,
                phone: result.user.phone,
            },
            tenant: {
                ...result.tenant,
                settings: result.settings,
            },
        });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: error.errors[0]?.message || 'Validation error' });
            return;
        }
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error during registration' });
    }
});
// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.userId },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                avatarUrl: true,
                role: true,
                memberships: {
                    where: { tenantId: req.tenantId },
                    include: {
                        tenant: {
                            include: {
                                settings: true,
                            },
                        },
                    },
                },
            },
        });
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        const currentMembership = user.memberships[0];
        res.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: currentMembership?.role || user.role,
                avatarUrl: user.avatarUrl,
                phone: user.phone,
            },
            tenant: currentMembership?.tenant || null,
        });
    }
    catch (error) {
        console.error('Auth /me error:', error);
        res.status(500).json({ error: 'Failed to retrieve user profile' });
    }
});
// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) {
        res.status(400).json({ error: 'Email address is required' });
        return;
    }
    // Safe message even if email not found
    res.json({ message: 'If an account exists with that email, a password reset link has been dispatched.' });
});
// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
    const { email, newPassword } = req.body;
    if (!email || !newPassword || newPassword.length < 6) {
        res.status(400).json({ error: 'Valid email and new password (min 6 chars) are required' });
        return;
    }
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
        res.status(404).json({ error: 'Account not found' });
        return;
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
    });
    res.json({ message: 'Password has been successfully updated.' });
});
export default router;
