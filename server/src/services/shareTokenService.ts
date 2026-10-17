import crypto from 'crypto';
import { config } from '../config.js';

export interface ShareTokenPayload {
  invoiceId: string;
  tenantId: string;
  expiresAt: number; // Unix timestamp in ms
}

export class ShareTokenService {
  private static readonly SECRET = config.jwtSecret || 'klanvision-secure-share-secret';

  /**
   * Generates a signed, URL-safe expiring share token for an invoice.
   * Default validity: 7 days.
   */
  static generateToken(invoiceId: string, tenantId: string, expiresInDays = 7): { token: string; expiresAt: Date } {
    const expiresAt = Date.now() + expiresInDays * 24 * 60 * 60 * 1000;
    const payload: ShareTokenPayload = {
      invoiceId,
      tenantId,
      expiresAt,
    };

    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', this.SECRET)
      .update(payloadBase64)
      .digest('hex');

    const token = `${payloadBase64}.${signature}`;
    return { token, expiresAt: new Date(expiresAt) };
  }

  /**
   * Verifies and decodes a share token. Throws if invalid or expired.
   */
  static verifyToken(token: string): ShareTokenPayload {
    if (!token || !token.includes('.')) {
      throw new Error('Invalid share link format');
    }

    const [payloadBase64, signature] = token.split('.');
    if (!payloadBase64 || !signature) {
      throw new Error('Malformed share token');
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', this.SECRET)
      .update(payloadBase64)
      .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'))) {
      throw new Error('Unauthorized or tampered share link');
    }

    // Parse payload
    let payload: ShareTokenPayload;
    try {
      const jsonStr = Buffer.from(payloadBase64, 'base64url').toString('utf-8');
      payload = JSON.parse(jsonStr);
    } catch {
      throw new Error('Corrupted share token payload');
    }

    // Check expiration
    if (Date.now() > payload.expiresAt) {
      throw new Error('This invoice share link has expired');
    }

    return payload;
  }
}
