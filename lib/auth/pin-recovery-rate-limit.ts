import { createHmac } from 'node:crypto';

type RpcResult = { data: unknown; error: { message?: string } | null };
type RpcClient = { rpc: (name: string, args: Record<string, unknown>) => PromiseLike<RpcResult> };

export type RecoveryReservation = {
  allowed: boolean;
  attempts: number;
  lockedUntil: string | null;
};

export function normalizeRecoveryEmail(email: string) {
  return email.trim().toLowerCase();
}

export function hashRecoveryEmail(email: string) {
  const secret = process.env.DASHBOARD_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('DASHBOARD_SESSION_SECRET must be configured with at least 32 characters');
  }
  return createHmac('sha256', secret).update(normalizeRecoveryEmail(email)).digest('hex');
}

export async function reservePinRecoveryRequest(client: RpcClient, email: string): Promise<RecoveryReservation> {
  const { data, error } = await client.rpc('reserve_pin_recovery_request', {
    p_email_hash: hashRecoveryEmail(email),
    p_max_attempts: 3,
    p_window_seconds: 15 * 60,
    p_lock_seconds: 15 * 60,
  });
  if (error) throw new Error(error.message || 'PIN recovery rate-limit check failed');

  const result = data as { allowed?: boolean; attempts?: number; locked_until?: string | null } | null;
  if (!result || typeof result.allowed !== 'boolean') throw new Error('PIN recovery rate-limit response was invalid');
  return {
    allowed: result.allowed,
    attempts: Number.isFinite(Number(result.attempts)) ? Number(result.attempts) : 0,
    lockedUntil: result.locked_until || null,
  };
}

export async function resetPinRecoveryRequestLimit(client: RpcClient, email: string) {
  const { error } = await client.rpc('reset_pin_recovery_request_limit', {
    p_email_hash: hashRecoveryEmail(email),
  });
  if (error) throw new Error(error.message || 'PIN recovery rate-limit reset failed');
}

export async function clearSuccessfulPinRecoveryLimits(
  client: RpcClient,
  userId: string,
  role: 'admin' | 'staff' | 'vendor',
  email: string,
) {
  const dashboardRole = role === 'vendor' ? 'vendor' : 'admin';
  const dashboard = await client.rpc('reset_dashboard_pin_attempts', {
    p_user_id: userId,
    p_role: dashboardRole,
  });
  if (dashboard.error) throw new Error(dashboard.error.message || 'Dashboard PIN lockout reset failed');
  await resetPinRecoveryRequestLimit(client, email);
}
