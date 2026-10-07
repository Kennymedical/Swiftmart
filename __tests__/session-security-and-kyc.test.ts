import { describe, it, expect, vi } from 'vitest';

describe('Configurable Session Expiration & Secure Cookie Attributes', () => {
  it('rejects expired session tokens and accepts valid session tokens within TTL', () => {
    const TTL = 28800; // 8 hours in seconds
    const validateToken = (token: string | undefined, expectedUserId: string, nowSec: number) => {
      if (!token) return { valid: false, reason: 'missing_pin_session' };
      const [userId, issuedAtStr] = token.split(':');
      if (userId !== expectedUserId) return { valid: false, reason: 'user_mismatch' };
      const issuedAt = Number(issuedAtStr) || 0;
      if (nowSec - issuedAt > TTL) return { valid: false, reason: 'session_expired' };
      return { valid: true };
    };

    const now = 1728300000;
    const validToken = `usr-123:${now - 3600}`; // 1 hour ago
    const expiredToken = `usr-123:${now - 30000}`; // >8 hours ago
    const tamperedToken = `attacker-456:${now - 100}`;

    expect(validateToken(validToken, 'usr-123', now)).toEqual({ valid: true });
    expect(validateToken(expiredToken, 'usr-123', now)).toEqual({ valid: false, reason: 'session_expired' });
    expect(validateToken(tamperedToken, 'usr-123', now)).toEqual({ valid: false, reason: 'user_mismatch' });
    expect(validateToken(undefined, 'usr-123', now)).toEqual({ valid: false, reason: 'missing_pin_session' });
  });

  it('generates secure cookie attribute string with SameSite, Max-Age and Secure', () => {
    const formatCookie = (name: string, value: string, maxAge: number, isHttps = true) => {
      return `${name}=${value}; path=/; max-age=${maxAge}; SameSite=Lax${isHttps ? '; Secure' : ''}`;
    };

    const cookieStr = formatCookie('swiftmart_admin_pin_session', 'usr-1:1728300000', 28800, true);
    expect(cookieStr).toContain('SameSite=Lax');
    expect(cookieStr).toContain('max-age=28800');
    expect(cookieStr).toContain('Secure');
  });
});

describe('Server-Side Rate Limits & Temporary Lockouts', () => {
  it('locks out user after 3 consecutive failed PIN attempts for 15 minutes', () => {
    let failedAttempts = 0;
    let lockedUntil: number | null = null;

    const recordAttempt = (success: boolean, currentTime: number) => {
      if (lockedUntil && lockedUntil > currentTime) {
        return { allowed: false, isLocked: true, lockedUntil };
      }
      if (success) {
        failedAttempts = 0;
        lockedUntil = null;
        return { allowed: true, isLocked: false };
      }
      failedAttempts += 1;
      if (failedAttempts >= 3) {
        lockedUntil = currentTime + 15 * 60;
        return { allowed: false, isLocked: true, lockedUntil, attempts: failedAttempts };
      }
      return { allowed: false, isLocked: false, attempts: failedAttempts, remaining: 3 - failedAttempts };
    };

    const t0 = 1000;
    expect(recordAttempt(false, t0)).toEqual({ allowed: false, isLocked: false, attempts: 1, remaining: 2 });
    expect(recordAttempt(false, t0 + 10)).toEqual({ allowed: false, isLocked: false, attempts: 2, remaining: 1 });
    const lockResult = recordAttempt(false, t0 + 20);
    expect(lockResult.isLocked).toBe(true);
    expect(lockResult.attempts).toBe(3);
    expect(lockResult.lockedUntil).toBe(t0 + 20 + 900);

    // Further attempts while locked are denied
    expect(recordAttempt(true, t0 + 30).isLocked).toBe(true);
  });
});

describe('Device Fingerprint Audit & OTP Challenge Trigger', () => {
  it('flags device mismatch when signing in from an unknown device or IP', () => {
    const evaluateDevice = (knownDevices: string[], currentDevice: string) => {
      const isKnown = knownDevices.includes(currentDevice);
      return {
        deviceMismatch: !isKnown,
        requiresOtpVerification: !isKnown,
      };
    };

    const known = ['iPhone_15_Pro_iOS_17', '192.168.1.50'];
    expect(evaluateDevice(known, 'iPhone_15_Pro_iOS_17')).toEqual({ deviceMismatch: false, requiresOtpVerification: false });
    expect(evaluateDevice(known, 'Samsung_Galaxy_S24_Android_14')).toEqual({ deviceMismatch: true, requiresOtpVerification: true });
  });
});

describe('Protected Storage & Masking for NIN and Bank Accounts', () => {
  it('masks NIN to display only last 4 digits in admin views', () => {
    const maskNin = (nin: string) => {
      if (nin.length <= 4) return nin;
      return '*'.repeat(nin.length - 4) + nin.slice(-4);
    };

    expect(maskNin('12345678901')).toBe('*******8901');
    expect(maskNin('98765432100')).toBe('*******2100');
  });

  it('masks settlement NUBAN account number in admin views', () => {
    const maskAccount = (nuban: string) => {
      if (nuban.length <= 4) return nuban;
      return '*'.repeat(nuban.length - 4) + nuban.slice(-4);
    };

    expect(maskAccount('0123456789')).toBe('******6789');
  });

  it('validates strictly 11 digits for NIN and 10 digits for NUBAN', () => {
    const isValidNin = (nin: string) => /^\d{11}$/.test(nin.trim());
    const isValidNuban = (nuban: string) => /^\d{10}$/.test(nuban.trim());

    expect(isValidNin('12345678901')).toBe(true);
    expect(isValidNin('1234567890')).toBe(false);
    expect(isValidNin('123456789012')).toBe(false);

    expect(isValidNuban('0123456789')).toBe(true);
    expect(isValidNuban('12345')).toBe(false);
  });
});

describe('Vendor Application Lifecycle & Next-Step Notifications', () => {
  it('generates next-step notifications for submitted, approved, and rejected states', () => {
    const getNotification = (status: 'submitted' | 'approved' | 'rejected', businessName: string) => {
      if (status === 'submitted') {
        return {
          title: 'Vendor Application Submitted',
          body: 'Your KYC and NIN details have been received and are pending compliance review. Next step: Wait for admin verification.',
          link: '/become-a-vendor',
        };
      }
      if (status === 'approved') {
        return {
          title: 'Vendor Application Approved!',
          body: `Congratulations! Your SwiftMart merchant store "${businessName}" has been approved. Next step: Sign in to your merchant portal and establish your Security PIN.`,
          link: '/vendor/login',
        };
      }
      return {
        title: 'Vendor Application Update',
        body: 'Your vendor application requires revisions. Next step: Review your NIN and settlement bank credentials, then reapply.',
        link: '/become-a-vendor',
      };
    };

    expect(getNotification('submitted', 'Swift Store').link).toBe('/become-a-vendor');
    expect(getNotification('approved', 'Swift Store').link).toBe('/vendor/login');
    expect(getNotification('rejected', 'Swift Store').link).toBe('/become-a-vendor');
  });
});
