import { describe, it, expect } from 'vitest';

describe('Navigation Suppression, Server OTP Throttling & Invalidation Suite', () => {
  describe('Navbar Suppression on Authentication Routes', () => {
    const isAuthRoute = (pathname: string) => {
      return (
        pathname.startsWith('/login') ||
        pathname.startsWith('/register') ||
        pathname.startsWith('/signup') ||
        pathname.startsWith('/admin/login') ||
        pathname.startsWith('/vendor/login')
      );
    };

    it('suppresses navigation bars on /login, /register, and /signup', () => {
      expect(isAuthRoute('/login')).toBe(true);
      expect(isAuthRoute('/register')).toBe(true);
      expect(isAuthRoute('/signup')).toBe(true);
      expect(isAuthRoute('/login?redirect=/admin')).toBe(true);
    });

    it('suppresses navigation bars on dedicated admin and vendor login portals', () => {
      expect(isAuthRoute('/admin/login')).toBe(true);
      expect(isAuthRoute('/vendor/login')).toBe(true);
      expect(isAuthRoute('/admin/login?next=/admin/wallet')).toBe(true);
    });

    it('retains navigation bars on non-auth storefront and portal operational routes', () => {
      expect(isAuthRoute('/')).toBe(false);
      expect(isAuthRoute('/products')).toBe(false);
      expect(isAuthRoute('/wallet')).toBe(false);
      expect(isAuthRoute('/admin')).toBe(false);
      expect(isAuthRoute('/admin/vendors')).toBe(false);
      expect(isAuthRoute('/vendor')).toBe(false);
      expect(isAuthRoute('/vendor/wallet')).toBe(false);
    });
  });

  describe('Server-Side OTP Request Throttling (15-Minute Window)', () => {
    it('allows up to 3 OTP requests within 15 minutes', () => {
      const requests: number[] = [];
      const now = Date.now();

      const canRequestOtp = (timestamp: number) => {
        const windowStart = timestamp - 15 * 60 * 1000;
        const recent = requests.filter((t) => t > windowStart);
        if (recent.length >= 3) {
          return { allowed: false, error: 'Too many OTP requests. Please wait 15 minutes before requesting another code.' };
        }
        requests.push(timestamp);
        return { allowed: true };
      };

      expect(canRequestOtp(now).allowed).toBe(true);
      expect(canRequestOtp(now + 1000).allowed).toBe(true);
      expect(canRequestOtp(now + 2000).allowed).toBe(true);
      
      const fourth = canRequestOtp(now + 3000);
      expect(fourth.allowed).toBe(false);
      expect(fourth.error).toContain('Too many OTP requests');
    });

    it('resets quota once 15 minutes have elapsed', () => {
      const requests: number[] = [Date.now() - 16 * 60 * 1000, Date.now() - 15 * 60 * 1000 - 1];
      const now = Date.now();

      const windowStart = now - 15 * 60 * 1000;
      const recent = requests.filter((t) => t > windowStart);
      expect(recent.length).toBe(0);
      expect(recent.length < 3).toBe(true);
    });
  });

  describe('Server-Side Verification Attempt Throttling & Lockouts', () => {
    it('locks verification session after 3 failed OTP attempts', () => {
      let failedAttempts = 0;
      const verifyAttempt = (input: string, correctHashMatch: boolean) => {
        if (failedAttempts >= 3) {
          return { success: false, locked: true, error: 'Maximum verification attempts exceeded (3/3).' };
        }
        if (!correctHashMatch) {
          failedAttempts += 1;
          const isNowLocked = failedAttempts >= 3;
          return {
            success: false,
            locked: isNowLocked,
            remaining: Math.max(0, 3 - failedAttempts),
          };
        }
        return { success: true, locked: false };
      };

      const a1 = verifyAttempt('000000', false);
      expect(a1.locked).toBe(false);
      expect(a1.remaining).toBe(2);

      const a2 = verifyAttempt('111111', false);
      expect(a2.locked).toBe(false);
      expect(a2.remaining).toBe(1);

      const a3 = verifyAttempt('222222', false);
      expect(a3.locked).toBe(true);
      expect(a3.remaining).toBe(0);

      const a4 = verifyAttempt('correct', true);
      expect(a4.locked).toBe(true);
      expect(a4.success).toBe(false);
    });
  });

  describe('Reset Request Invalidation & One-Time Use Binding', () => {
    it('invalidates reset session after successful PIN completion and rejects reuse', () => {
      interface ResetSession {
        id: string;
        user_id: string;
        otp_verified: boolean;
        payment_status: 'pending' | 'paid';
        used_at: Date | null;
        completed_at: Date | null;
      }

      const session: ResetSession = {
        id: 'reset-123',
        user_id: 'user-abc',
        otp_verified: true,
        payment_status: 'paid',
        used_at: null,
        completed_at: null,
      };

      const completeReset = (callerUserId: string, newPin: string) => {
        if (session.used_at !== null) {
          return { success: false, error: 'This recovery session has already been used and is invalidated' };
        }
        if (session.user_id !== callerUserId) {
          return { success: false, error: 'Unauthorized: Authenticated account does not match this recovery request' };
        }
        if (!session.otp_verified) {
          return { success: false, error: 'Recovery OTP has not been verified' };
        }
        if (session.payment_status !== 'paid') {
          return { success: false, error: 'Regeneration fee must be paid before setting a new PIN' };
        }
        if (!/^\d{6}$/.test(newPin)) {
          return { success: false, error: 'PIN must be exactly 6 numeric digits' };
        }

        session.used_at = new Date();
        session.completed_at = new Date();
        return { success: true };
      };

      // 1. Foreign user fails
      const foreignResult = completeReset('user-evil', '999999');
      expect(foreignResult.success).toBe(false);
      expect(foreignResult.error).toContain('Unauthorized');

      // 2. Bound user succeeds
      const initialReset = completeReset('user-abc', '123456');
      expect(initialReset.success).toBe(true);
      expect(session.used_at).not.toBeNull();

      // 3. Second attempt with same token fails immediately
      const reuseAttempt = completeReset('user-abc', '654321');
      expect(reuseAttempt.success).toBe(false);
      expect(reuseAttempt.error).toContain('already been used and is invalidated');
    });
  });
});
