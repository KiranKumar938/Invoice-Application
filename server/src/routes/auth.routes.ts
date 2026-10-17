import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { config } from '../config.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import {
  createSession,
  setSessionCookie,
  clearSessionCookie,
  invalidateSession,
  invalidateAllUserSessions,
} from '../services/sessionService.js';
import {
  generatePasswordResetToken,
  verifyPasswordResetToken,
  markTokenUsed,
} from '../services/tokenService.js';
import { sendPasswordResetEmail } from '../services/emailService.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional().default(false),
});

const registerSchema = z.object({
  name: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid work email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  companyName: z.string().min(2, 'Company name is required'),
  phone: z.string().optional(),
  gstin: z.string().optional(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
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

    // Create secure persistent database session
    const { session, sessionDurationMs } = await createSession({
      userId: user.id,
      tenantId: defaultMembership.tenantId,
      rememberMe: validated.rememberMe,
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    });

    // Sign JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: defaultMembership.role,
        tenantId: defaultMembership.tenantId,
        sessionToken: session.sessionToken,
      },
      config.jwtSecret,
      { expiresIn: Math.floor(sessionDurationMs / 1000) }
    );

    // Set secure HTTP-only cookie
    setSessionCookie(res, token, validated.rememberMe);

    // Record audit log
    await prisma.auditLog.create({
      data: {
        tenantId: defaultMembership.tenantId,
        userId: user.id,
        action: 'LOGIN',
        entityType: 'USER',
        entityId: user.id,
        details: `User ${user.email} signed in successfully (Remember me: ${validated.rememberMe})`,
        ipAddress: req.ip || req.socket.remoteAddress,
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
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0]?.message || 'Validation error' });
      return;
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during authentication' });
  }
});

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response): Promise<void> => {
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
          role: 'OWNER',
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
          role: 'OWNER',
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

    // Create session
    const { session, sessionDurationMs } = await createSession({
      userId: result.user.id,
      tenantId: result.tenant.id,
      rememberMe: true,
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    });

    const token = jwt.sign(
      {
        userId: result.user.id,
        email: result.user.email,
        role: result.membership.role,
        tenantId: result.tenant.id,
        sessionToken: session.sessionToken,
      },
      config.jwtSecret,
      { expiresIn: Math.floor(sessionDurationMs / 1000) }
    );

    setSessionCookie(res, token, true);

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
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0]?.message || 'Validation error' });
      return;
    }
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.sessionToken) {
      await invalidateSession(req.sessionToken);
    }

    clearSessionCookie(res);

    if (req.tenantId && req.userId) {
      await prisma.auditLog.create({
        data: {
          tenantId: req.tenantId,
          userId: req.userId,
          action: 'LOGOUT',
          entityType: 'USER',
          entityId: req.userId,
          details: 'User logged out',
        },
      });
    }

    res.json({ message: 'Successfully signed out' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Failed to complete logout' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
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
  } catch (error) {
    console.error('Auth /me error:', error);
    res.status(500).json({ error: 'Failed to retrieve user profile' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      res.status(400).json({ error: 'A valid email address is required' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (user && user.isActive) {
      const rawToken = await generatePasswordResetToken(user.id);
      await sendPasswordResetEmail(user.email, user.name, rawToken);
    }

    // Constant-time style safe response: never reveal whether account exists
    res.json({
      message: 'If an account exists with that email address, password reset instructions have been dispatched.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process password recovery request' });
  }
});

// POST /api/auth/verify-reset-token
router.post('/verify-reset-token', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.body;
    const verification = await verifyPasswordResetToken(token);

    if (!verification.valid) {
      res.status(400).json({ error: verification.error || 'Invalid or expired token' });
      return;
    }

    res.json({ valid: true });
  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({ error: 'Failed to verify reset token' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const validated = resetPasswordSchema.parse(req.body);

    const verification = await verifyPasswordResetToken(validated.token);
    if (!verification.valid || !verification.userId) {
      res.status(400).json({ error: verification.error || 'Invalid or expired token' });
      return;
    }

    const newPasswordHash = await bcrypt.hash(validated.newPassword, 10);

    // Update password, mark token used, and revoke existing sessions
    await prisma.user.update({
      where: { id: verification.userId },
      data: { passwordHash: newPasswordHash },
    });

    await markTokenUsed(validated.token);
    await invalidateAllUserSessions(verification.userId);

    res.json({ message: 'Password has been successfully updated. You may now sign in with your new password.' });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0]?.message || 'Validation error' });
      return;
    }
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// PUT /api/auth/profile
router.put('/profile', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, phone } = req.body;
    if (!name || name.trim().length < 2) {
      res.status(400).json({ error: 'Name must be at least 2 characters' });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.userId },
      data: {
        name: name.trim(),
        phone: phone || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
      },
    });

    res.json({ user: updatedUser, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// PUT /api/auth/change-password
router.put('/change-password', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      res.status(400).json({ error: 'Current password and valid new password (min 6 chars) are required' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      res.status(400).json({ error: 'Current password does not match' });
      return;
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

export default router;
