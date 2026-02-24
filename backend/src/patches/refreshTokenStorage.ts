/**
 * SECURITY PATCH: Refresh Token Storage and Revocation
 * 
 * This patch implements:
 * - Refresh token storage in database
 * - Token revocation on logout
 * - Token rotation on refresh
 * - Replay prevention
 * 
 * Database migration required:
 * CREATE TABLE refresh_tokens (
 *   id SERIAL PRIMARY KEY,
 *   token_hash VARCHAR(64) NOT NULL UNIQUE,
 *   user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 *   expires_at TIMESTAMP NOT NULL,
 *   revoked_at TIMESTAMP,
 *   device_info TEXT,
 *   ip_address INET,
 *   created_at TIMESTAMP DEFAULT NOW(),
 *   INDEX idx_user_id (user_id),
 *   INDEX idx_token_hash (token_hash),
 *   INDEX idx_expires_at (expires_at)
 * );
 */

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

interface TokenPayload {
  id: number;
  type: string;
  jti?: string;
}

function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return 0;
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  };
  
  return value * (multipliers[unit] || 1000);
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function storeRefreshToken(
  token: string,
  userId: number,
  expiresIn: string | number,
  deviceInfo: string,
  ipAddress: string
): Promise<void> {
  const tokenHash = hashToken(token);
  const expiresAt = new Date(
    Date.now() + (typeof expiresIn === 'string' 
      ? parseDuration(expiresIn) 
      : expiresIn * 1000)
  );

  await prisma.refreshToken.create({
    data: {
      tokenHash,
      userId,
      expiresAt,
      deviceInfo,
      ipAddress
    }
  });
}

export async function validateRefreshToken(
  token: string,
  userId: number
): Promise<boolean> {
  const tokenHash = hashToken(token);
  
  const storedToken = await prisma.refreshToken.findFirst({
    where: {
      tokenHash,
      userId,
      revokedAt: null,
      expiresAt: { gt: new Date() }
    }
  });

  return !!storedToken;
}

export async function revokeRefreshToken(
  token: string,
  userId: number
): Promise<void> {
  const tokenHash = hashToken(token);
  
  await prisma.refreshToken.updateMany({
    where: {
      tokenHash,
      userId,
      revokedAt: null
    },
    data: { revokedAt: new Date() }
  });
}

export async function revokeAllUserTokens(userId: number): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: {
      userId,
      revokedAt: null
    },
    data: { revokedAt: new Date() }
  });
}

export async function rotateRefreshToken(
  oldToken: string,
  newToken: string,
  userId: number,
  expiresIn: string | number,
  deviceInfo: string,
  ipAddress: string
): Promise<void> {
  // Revoke old token
  await revokeRefreshToken(oldToken, userId);
  
  // Store new token
  await storeRefreshToken(newToken, userId, expiresIn, deviceInfo, ipAddress);
}

export function generateTokenId(): string {
  return crypto.randomUUID();
}

