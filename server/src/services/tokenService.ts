import crypto from 'crypto';
import { prisma } from '../prisma.js';

export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

export const generatePasswordResetToken = async (userId: string): Promise<string> => {
  // Generate high-entropy 256-bit cryptographic token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);

  // Invalidate any existing active tokens for this user
  await prisma.passwordResetToken.deleteMany({
    where: { userId },
  });

  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour validity

  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return rawToken;
};

export const verifyPasswordResetToken = async (
  rawToken: string
): Promise<{ valid: boolean; userId?: string; error?: string }> => {
  if (!rawToken || typeof rawToken !== 'string') {
    return { valid: false, error: 'Token is required' };
  }

  const tokenHash = hashToken(rawToken);

  const tokenRecord = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!tokenRecord) {
    return { valid: false, error: 'Invalid or expired password reset link' };
  }

  if (tokenRecord.usedAt) {
    return { valid: false, error: 'This password reset link has already been used' };
  }

  if (new Date() > tokenRecord.expiresAt) {
    return { valid: false, error: 'This password reset link has expired. Please request a new one.' };
  }

  return { valid: true, userId: tokenRecord.userId };
};

export const markTokenUsed = async (rawToken: string): Promise<void> => {
  const tokenHash = hashToken(rawToken);
  await prisma.passwordResetToken.update({
    where: { tokenHash },
    data: { usedAt: new Date() },
  });
};
