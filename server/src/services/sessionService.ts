import { Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma.js';
import { config } from '../config.js';

export const COOKIE_NAME = 'klanvision_session';

export interface CreateSessionOptions {
  userId: string;
  tenantId: string;
  rememberMe?: boolean;
  ipAddress?: string;
  userAgent?: string;
}

export const createSession = async (options: CreateSessionOptions) => {
  const { userId, tenantId, rememberMe = false, ipAddress, userAgent } = options;

  const sessionDurationMs = rememberMe
    ? 30 * 24 * 60 * 60 * 1000 // 30 days for Remember Me
    : 24 * 60 * 60 * 1000; // 24 hours standard

  const expiresAt = new Date(Date.now() + sessionDurationMs);
  const sessionToken = crypto.randomBytes(32).toString('hex');

  const session = await prisma.session.create({
    data: {
      userId,
      tenantId,
      sessionToken,
      expiresAt,
      rememberMe,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
    },
  });

  return { session, expiresAt, sessionDurationMs };
};

export const setSessionCookie = (
  res: Response,
  token: string,
  rememberMe: boolean = false
) => {
  const maxAge = rememberMe
    ? 30 * 24 * 60 * 60 * 1000
    : 24 * 60 * 60 * 1000;

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax',
    maxAge,
    path: '/',
  });
};

export const clearSessionCookie = (res: Response) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax',
    path: '/',
  });
};

export const invalidateSession = async (sessionToken: string): Promise<void> => {
  if (!sessionToken) return;
  await prisma.session.deleteMany({
    where: { sessionToken },
  });
};

export const invalidateAllUserSessions = async (userId: string): Promise<void> => {
  await prisma.session.deleteMany({
    where: { userId },
  });
};
