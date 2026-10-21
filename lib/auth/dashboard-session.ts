import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
export type DashboardRole = 'admin' | 'staff' | 'vendor';
export const DASHBOARD_SESSION_TTL_SECONDS = Math.max(
  300,
  Math.min(Number(process.env.DASHBOARD_SESSION_TTL_SECONDS) || 8 * 60 * 60, 24 * 60 * 60),
);
export const PIN_COOKIE_NAMES = ['swiftmart_admin_pin_session', 'swiftmart_vendor_pin_session'] as const;

function getSigningSecret() {
  const secret = process.env.DASHBOARD_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error('DASHBOARD_SESSION_SECRET must be configured with at least 32 characters');
  return secret;
}

export async function hashDashboardPin(pin: string) {
  const salt = randomBytes(16);
  const derived = (await scrypt(pin, salt, 64)) as Buffer;
  return `scrypt$${salt.toString('base64url')}$${derived.toString('base64url')}`;
}

export async function verifyDashboardPin(pin: string, stored: string) {
  if (stored.startsWith('scrypt$')) {
    const [, saltPart, hashPart] = stored.split('$');
    if (!saltPart || !hashPart) return false;
    try {
      const salt = Buffer.from(saltPart, 'base64url');
      const expected = Buffer.from(hashPart, 'base64url');
      const actual = (await scrypt(pin, salt, expected.length)) as Buffer;
      return expected.length === actual.length && timingSafeEqual(expected, actual);
    } catch {
      return false;
    }
  }
  // Temporary compatibility for legacy plaintext PINs. Successful verification
  // must immediately upgrade the database value to the scrypt format.
  const provided = Buffer.from(pin);
  const legacy = Buffer.from(stored);
  return /^\d{6}$/.test(stored) && provided.length === legacy.length && timingSafeEqual(provided, legacy);
}

export function isLegacyPin(stored: string) {
  return /^\d{6}$/.test(stored);
}

export function createDashboardSessionToken(userId: string, role: DashboardRole) {
  const payload = Buffer.from(JSON.stringify({
    sub: userId,
    role,
    iat: Math.floor(Date.now() / 1000),
    nonce: randomBytes(16).toString('base64url'),
  })).toString('base64url');
  const signature = createHmac('sha256', getSigningSecret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function verifyDashboardSessionToken(token: string, userId: string, role: DashboardRole) {
  try {
    const [payload, signature, extra] = token.split('.');
    if (!payload || !signature || extra) return false;
    const expected = createHmac('sha256', getSigningSecret()).update(payload).digest();
    const supplied = Buffer.from(signature, 'base64url');
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return false;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      sub?: string; role?: string; iat?: number; nonce?: string;
    };
    const now = Math.floor(Date.now() / 1000);
    return data.sub === userId && data.role === role && Number.isInteger(data.iat) &&
      !!data.iat && data.iat <= now + 60 && now - data.iat < DASHBOARD_SESSION_TTL_SECONDS &&
      typeof data.nonce === 'string' && data.nonce.length >= 16;
  } catch {
    return false;
  }
}

export function dashboardCookieOptions(maxAge = DASHBOARD_SESSION_TTL_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge,
  };
}
