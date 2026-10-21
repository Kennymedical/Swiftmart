import { afterEach, describe, expect, it } from 'vitest';
import {
  createDashboardSessionToken,
  dashboardCookieOptions,
  hashDashboardPin,
  verifyDashboardPin,
  verifyDashboardSessionToken,
} from '@/lib/auth/dashboard-session';

describe('Dashboard session and PIN crypto', () => {
  const originalSecret = process.env.DASHBOARD_SESSION_SECRET;
  afterEach(() => {
    if (originalSecret === undefined) delete process.env.DASHBOARD_SESSION_SECRET;
    else process.env.DASHBOARD_SESSION_SECRET = originalSecret;
  });

  it('hashes PINs and verifies only the matching PIN', async () => {
    const hash = await hashDashboardPin('012345');
    expect(hash).toMatch(/^scrypt\$/);
    expect(hash).not.toContain('012345');
    await expect(verifyDashboardPin('012345', hash)).resolves.toBe(true);
    await expect(verifyDashboardPin('012346', hash)).resolves.toBe(false);
  });

  it('accepts a signed session only for its user and role', () => {
    process.env.DASHBOARD_SESSION_SECRET = 'test-secret-that-is-long-enough-for-signing';
    const token = createDashboardSessionToken('user-1', 'admin');
    expect(verifyDashboardSessionToken(token, 'user-1', 'admin')).toBe(true);
    expect(verifyDashboardSessionToken(token, 'user-2', 'admin')).toBe(false);
    expect(verifyDashboardSessionToken(token, 'user-1', 'staff')).toBe(false);
    expect(verifyDashboardSessionToken(`${token}tampered`, 'user-1', 'admin')).toBe(false);
  });

  it('requires an HttpOnly same-site session cookie', () => {
    const options = dashboardCookieOptions();
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe('strict');
    expect(options.path).toBe('/');
  });
});
