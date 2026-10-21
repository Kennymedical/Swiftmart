import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearSuccessfulPinRecoveryLimits,
  hashRecoveryEmail,
  normalizeRecoveryEmail,
  reservePinRecoveryRequest,
} from '@/lib/auth/pin-recovery-rate-limit';

type State = { attempts: number; startedAt: number; lockedUntil: number | null };
function createRecoveryLimitRpc(now: () => number) {
  const rows = new Map<string, State>();
  return {
    rows,
    rpc: async (name: string, args: Record<string, unknown>) => {
      const key = name === 'reserve_dashboard_pin_attempt' ? `${args.p_user_id}:${args.p_role}` : String(args.p_email_hash);
      if (name === 'reset_dashboard_pin_attempts') {
        rows.delete(`${args.p_user_id}:${args.p_role}`);
        return { data: null, error: null };
      }
      if (name === 'reset_pin_recovery_request_limit') {
        rows.delete(key);
        return { data: null, error: null };
      }
      if (name !== 'reserve_pin_recovery_request' && name !== 'reserve_dashboard_pin_attempt') return { data: null, error: { message: 'unknown rpc' } };
      const max = Number(args.p_max_attempts);
      const windowMs = Number(args.p_window_seconds) * 1000;
      const lockMs = Number(args.p_lock_seconds) * 1000;
      const time = now();
      const row = rows.get(key);
      if (!row || time - row.startedAt >= windowMs) {
        rows.set(key, { attempts: 1, startedAt: time, lockedUntil: null });
      } else if (row.lockedUntil && row.lockedUntil > time) {
        return { data: { allowed: false, attempts: row.attempts, locked_until: new Date(row.lockedUntil).toISOString() }, error: null };
      } else if (row.attempts >= max) {
        row.lockedUntil = time + lockMs;
      } else {
        row.attempts += 1;
      }
      const current = rows.get(key)!;
      return { data: { allowed: !current.lockedUntil || current.lockedUntil <= time, attempts: current.attempts, locked_until: current.lockedUntil ? new Date(current.lockedUntil).toISOString() : null }, error: null };
    },
  };
}

describe('PIN recovery request rate limiting', () => {
  beforeEach(() => {
    vi.stubEnv('DASHBOARD_SESSION_SECRET', 'unit-test-secret-at-least-thirty-two-characters');
  });

  it('normalizes and irreversibly keys an email without storing the address', () => {
    expect(normalizeRecoveryEmail('  User@Example.com ')).toBe('user@example.com');
    expect(hashRecoveryEmail('User@Example.com')).toBe(hashRecoveryEmail(' user@example.com '));
    expect(hashRecoveryEmail('user@example.com')).not.toContain('user@example.com');
  });

  it('allows three requests, locks repeated requests, and expires the lockout', async () => {
    let now = 1_000_000;
    const client = createRecoveryLimitRpc(() => now);
    const reserve = () => reservePinRecoveryRequest(client, 'person@example.com');
    expect(await reserve()).toMatchObject({ allowed: true, attempts: 1 });
    expect(await reserve()).toMatchObject({ allowed: true, attempts: 2 });
    expect(await reserve()).toMatchObject({ allowed: true, attempts: 3 });
    const locked = await reserve();
    expect(locked.allowed).toBe(false);
    expect(locked.lockedUntil).not.toBeNull();
    expect((await reserve()).allowed).toBe(false);

    now += 15 * 60 * 1000 + 1;
    expect(await reserve()).toMatchObject({ allowed: true, attempts: 1, lockedUntil: null });
  });

  it('clears the request lock after successful recovery so a future recovery can proceed', async () => {
    const client = createRecoveryLimitRpc(() => 1_000_000);
    await reservePinRecoveryRequest(client, 'person@example.com');
    await reservePinRecoveryRequest(client, 'person@example.com');
    await reservePinRecoveryRequest(client, 'person@example.com');
    expect((await reservePinRecoveryRequest(client, 'person@example.com')).allowed).toBe(false);

    await clearSuccessfulPinRecoveryLimits(client, 'user-1', 'vendor', 'person@example.com');
    expect(client.rows.size).toBe(0);
    expect(await reservePinRecoveryRequest(client, 'person@example.com')).toMatchObject({ allowed: true, attempts: 1 });
  });

  it('fails closed when the persistent rate-limit RPC is unavailable', async () => {
    const client = { rpc: async () => ({ data: null, error: { message: 'database unavailable' } }) };
    await expect(reservePinRecoveryRequest(client, 'person@example.com')).rejects.toThrow('database unavailable');
  });
});
