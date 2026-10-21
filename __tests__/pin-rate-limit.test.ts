import { describe, expect, it } from 'vitest';
import { reserveDashboardPinAttempt, resetDashboardPinAttempts } from '@/lib/auth/pin-rate-limit';

type State = { attempts: number; startedAt: number; lockedUntil: number | null };
function createRateLimitRpc(now: () => number) {
  const rows = new Map<string, State>();
  return {
    rows,
    rpc: async (name: string, args: Record<string, unknown>) => {
      const key = `${args.p_user_id}:${args.p_role}`;
      if (name === 'reset_dashboard_pin_attempts') {
        rows.delete(key);
        return { data: null, error: null };
      }
      if (name !== 'reserve_dashboard_pin_attempt') return { data: null, error: { message: 'unknown rpc' } };
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

describe('Persistent dashboard PIN rate limit', () => {
  it('allows three attempts, then temporarily locks repeated failures', async () => {
    let now = 1_000_000;
    const client = createRateLimitRpc(() => now);
    const reserve = () => reserveDashboardPinAttempt(client, 'user-1', 'vendor');
    expect(await reserve()).toMatchObject({ allowed: true, attempts: 1 });
    expect(await reserve()).toMatchObject({ allowed: true, attempts: 2 });
    expect(await reserve()).toMatchObject({ allowed: true, attempts: 3 });
    const locked = await reserve();
    expect(locked.allowed).toBe(false);
    expect(locked.attempts).toBe(3);
    expect(locked.lockedUntil).not.toBeNull();
    expect((await reserve()).allowed).toBe(false);

    now += 15 * 60 * 1000 + 1;
    expect(await reserve()).toMatchObject({ allowed: true, attempts: 1, lockedUntil: null });
  });

  it('resets the account limiter after a successful PIN verification', async () => {
    const client = createRateLimitRpc(() => 1_000_000);
    await reserveDashboardPinAttempt(client, 'user-1', 'admin');
    await reserveDashboardPinAttempt(client, 'user-1', 'admin');
    await resetDashboardPinAttempts(client, 'user-1', 'admin');
    expect(client.rows.size).toBe(0);
    expect(await reserveDashboardPinAttempt(client, 'user-1', 'admin')).toMatchObject({ allowed: true, attempts: 1 });
  });

  it('fails closed when the database rate-limit RPC is unavailable', async () => {
    const client = { rpc: async () => ({ data: null, error: { message: 'database unavailable' } }) };
    await expect(reserveDashboardPinAttempt(client, 'user-1', 'admin')).rejects.toThrow('database unavailable');
  });
});
