export async function extractEdgeError(
  error: any,
  fallback: string = 'Transfer failed. Check your wallet balance.'
): Promise<string> {
  if (!error) return fallback;
  if (typeof error === 'string') return error;

  if (error && typeof error === 'object' && error.context && typeof error.context.json === 'function') {
    try {
      const errJson = await error.context.json();
      if (errJson && typeof errJson === 'object') {
        if (typeof errJson.error === 'string') return errJson.error;
        if (typeof errJson.message === 'string') return errJson.message;
      }
    } catch {
      // Ignore JSON extraction errors and fall back to top-level message.
    }
  }

  if (error && typeof error === 'object' && typeof error.message === 'string') {
    if (error.message.includes('non-2xx')) {
      return 'Paystack transfer error: Test account balance is empty or transfers are disabled in your Paystack dashboard.';
    }
    return error.message;
  }

  return fallback;
}

export async function extractAdminPayoutError(
  payoutErr: any,
  payoutData?: any,
  fallback: string = 'Payout transfer failed via Paystack'
): Promise<string> {
  let errMsg = payoutData?.error;
  if (!errMsg && payoutErr) {
    try {
      if (payoutErr.context && typeof payoutErr.context.json === 'function') {
        const b = await payoutErr.context.json();
        errMsg = b?.error || b?.message;
      }
    } catch {}
    if (!errMsg && payoutErr.message) {
      errMsg = payoutErr.message.includes('non-2xx')
        ? 'Paystack transfer error: Check your Paystack dashboard balance and ensure Transfers are enabled for your account.'
        : payoutErr.message;
    }
  }
  return errMsg || payoutErr?.message || fallback;
}
