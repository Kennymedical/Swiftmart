type RpcResult = { data: unknown; error: { message?: string } | null };
type RpcClient = { rpc: (name: string, args: Record<string, unknown>) => PromiseLike<RpcResult> };

export type PinAttemptReservation = {
  allowed: boolean;
  attempts: number;
  lockedUntil: string | null;
};

export async function reserveDashboardPinAttempt(
  client: RpcClient,
  userId: string,
  role: 'admin' | 'staff' | 'vendor',
): Promise<PinAttemptReservation> {
  const { data, error } = await client.rpc('reserve_dashboard_pin_attempt', {
    p_user_id: userId,
    p_role: role === 'vendor' ? 'vendor' : 'admin',
    p_max_attempts: 3,
    p_window_seconds: 15 * 60,
    p_lock_seconds: 15 * 60,
  });
  if (error) throw new Error(error.message || 'PIN rate-limit check failed');

  const result = data as { allowed?: boolean; attempts?: number; locked_until?: string | null } | null;
  if (!result || typeof result.allowed !== 'boolean') throw new Error('PIN rate-limit response was invalid');
  return {
    allowed: result.allowed,
    attempts: Number.isFinite(Number(result.attempts)) ? Number(result.attempts) : 0,
    lockedUntil: result.locked_until || null,
  };
}

export async function resetDashboardPinAttempts(
  client: RpcClient,
  userId: string,
  role: 'admin' | 'staff' | 'vendor',
) {
  const { error } = await client.rpc('reset_dashboard_pin_attempts', {
    p_user_id: userId,
    p_role: role === 'vendor' ? 'vendor' : 'admin',
  });
  if (error) throw new Error(error.message || 'PIN rate-limit reset failed');
}
