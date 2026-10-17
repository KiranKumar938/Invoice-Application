import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { prisma } from '../prisma.js';
import { COOKIE_NAME } from '../services/sessionService.js';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
  tenantId?: string;
  sessionToken?: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  tenantId: string;
  sessionToken?: string;
}

// Role hierarchy definitions
export const ROLES = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  ACCOUNTANT: 'ACCOUNTANT',
  VIEWER: 'VIEWER',
} as const;

export type UserRole = keyof typeof ROLES;

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // 1. Check HTTP-only cookie first, then fallback to Authorization header
  let token: string | undefined = req.cookies?.[COOKIE_NAME];

  const authHeader = req.headers.authorization;
  if (!token && authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    res.status(401).json({ error: 'Unauthorized: Authentication session or token is required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;

    // Check if session in DB has expired or was revoked
    if (decoded.sessionToken) {
      const dbSession = await prisma.session.findUnique({
        where: { sessionToken: decoded.sessionToken },
      });

      if (!dbSession || new Date() > dbSession.expiresAt) {
        res.status(401).json({ error: 'Session has expired. Please sign in again.' });
        return;
      }
      req.sessionToken = decoded.sessionToken;
    }

    req.userId = decoded.userId;
    req.tenantId = decoded.tenantId;

    // 2. Strict Tenant Isolation: verify membership within tenant
    const membership = await prisma.membership.findFirst({
      where: {
        userId: decoded.userId,
        tenantId: decoded.tenantId,
      },
      include: {
        tenant: true,
      },
    });

    if (!membership || !membership.tenant.isActive) {
      res.status(403).json({ error: 'Forbidden: You do not have access to this workspace or workspace is inactive' });
      return;
    }

    req.userRole = membership.role.toUpperCase();
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({ error: 'Session has expired. Please sign in again.' });
      return;
    }
    res.status(401).json({ error: 'Unauthorized: Token is invalid' });
    return;
  }
};

/**
 * Enforces role-based permissions:
 * - OWNER: All operations
 * - ADMIN: All operations except workspace ownership transfer
 * - ACCOUNTANT: Invoicing, customers, products, payments, reports (read/write), read-only settings
 * - VIEWER: Strictly read-only (GET requests only)
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.userRole) {
      res.status(403).json({ error: 'Forbidden: No role assigned' });
      return;
    }

    const normalizedRole = req.userRole.toUpperCase();
    const normalizedAllowed = allowedRoles.map((r) => r.toUpperCase());

    if (!normalizedAllowed.includes(normalizedRole)) {
      res.status(403).json({
        error: `Forbidden: Access requires one of [${allowedRoles.join(', ')}] permissions. Current role: ${req.userRole}`,
      });
      return;
    }

    next();
  };
};

/**
 * Write operation protection: automatically denies VIEWER role from mutating data
 */
export const requireWriteAccess = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (req.userRole?.toUpperCase() === ROLES.VIEWER) {
    res.status(403).json({
      error: 'Forbidden: Viewer accounts have read-only access and cannot create, modify, or delete records.',
    });
    return;
  }
  next();
};
