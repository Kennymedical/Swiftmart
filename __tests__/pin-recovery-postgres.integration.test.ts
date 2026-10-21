import { createClient } from '@supabase/supabase-js';
import { afterAll, describe, expect, it } from 'vitest';
import { createHmac, randomUUID } from 'node:crypto';

// Run only against a dedicated/staging Supabase project after applying migration 0018:
// SUPABASE_INTEGRATION_URL=... SUPABASE_INTEGRATION_SERVICE_ROLE_KEY=... npm run test:integration:pin-recovery
const url = process.env.SUPABASE_INTEGRATION_URL;
const serviceKey = process.env.SUPABASE_INTEGRATION_SERVICE_ROLE_KEY;
const enabled = Boolean(url && serviceKey);
const suite = enabled ? describe : describe.skip;
const supabase = enabled
  ? createClient(url!, serviceKey!, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;
const testEmail = `pin-recovery-concurrency-${randomUUID()}@integration.invalid`;
// The SQL RPC accepts only a SHA-256 hex digest. HMAC ensures this test never stores an address.
const emailHash = createHmac('sha256', randomUUID()).update(testEmail).digest('hex');

afterAll(async () => {
  if (!supabase || !enabled) return;
  const { error } = await supabase.rpc('reset_pin_recovery_request_limit', { p_email_hash: emailHash });
  if (error) throw new Error(`Integration cleanup failed: ${error.message}`);
});

suite('PostgreSQL PIN recovery limiter concurrency (live integration)', () => {
  it('atomically permits only three simultaneous requests and locks all subsequent calls', async () => {
    const calls = Array.from({ length: 40 }, () =>
      supabase!.rpc('reserve_pin_recovery_request', {
        p_email_hash: emailHash,
        p_max_attempts: 3,
        p_window_seconds: 900,
        p_lock_seconds: 900,
      }),
    );
    const results = await Promise.all(calls);
    const errors = results.filter((result) => result.error);
    expect(errors, errors.map((result) => result.error?.message).join('; ')).toHaveLength(0);
    const reservations = results.map((result) => result.data as { allowed: boolean; attempts: number; locked_until: string | null });
    expect(reservations.filter((result) => result.allowed)).toHaveLength(3);
    expect(reservations.filter((result) => !result.allowed)).toHaveLength(37);
    expect(reservations.filter((result) => result.allowed).every((result) => result.locked_until === null)).toBe(true);
    expect(reservations.filter((result) => !result.allowed).every((result) => Boolean(result.locked_until))).toBe(true);

    const whileLocked = await Promise.all(Array.from({ length: 20 }, () =>
      supabase!.rpc('reserve_pin_recovery_request', {
        p_email_hash: emailHash,
        p_max_attempts: 3,
        p_window_seconds: 900,
        p_lock_seconds: 900,
      }),
    ));
    expect(whileLocked.every((result) => !result.error && (result.data as { allowed: boolean }).allowed === false)).toBe(true);
  }, 30_000);
});
