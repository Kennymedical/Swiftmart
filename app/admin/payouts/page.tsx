import { createClient } from '@/lib/supabase/server';
import { PayoutActions } from './PayoutActions';

export default async function AdminPayoutsPage() {
  const supabase = createClient();

  const { data: payouts } = await supabase
    .from('transactions')
    .select('id, amount_kobo, description, metadata, created_at, wallet_id')
    .eq('type', 'payout')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  const walletIds = [...new Set((payouts ?? []).map((p) => p.wallet_id))];
  const { data: wallets } = walletIds.length
    ? await supabase.from('wallets').select('id, user_id').in('id', walletIds)
    : { data: [] };
  const userIds = [...new Set((wallets ?? []).map((w) => w.user_id))];
  const { data: profiles } = userIds.length
    ? await supabase.from('profiles').select('id, username, full_name').in('id', userIds)
    : { data: [] };

  const walletToUser = new Map((wallets ?? []).map((w) => [w.id, w.user_id]));
  const userToProfile = new Map((profiles ?? []).map((p) => [p.id, p]));

  return (
    <div className="max-w-2xl mx-auto p-4">
      {(!payouts || payouts.length === 0) ? (
        <p className="text-center text-gray-500 py-16">No pending payouts.</p>
      ) : (
        <div className="space-y-3">
          {payouts.map((payout) => {
            const requesterId = walletToUser.get(payout.wallet_id);
            const requester = requesterId ? userToProfile.get(requesterId) : null;
            const meta = payout.metadata as {
              bankCode?: string;
              accountNumber?: string;
              accountName?: string;
            } | null;

            return (
              <div key={payout.id} className="bg-white rounded-2xl shadow-sm p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-semibold text-[#0F172A]">
                      {requester?.full_name ?? requester?.username ?? 'Unknown user'}
                    </p>
                    <p className="text-xs text-gray-500">
                      @{requester?.username ?? '—'} ·{' '}
                      {new Date(payout.created_at).toLocaleString()}
                    </p>
                  </div>
                  <p className="text-lg font-bold text-[#0F172A]">
                    ₦{(payout.amount_kobo / 100).toLocaleString()}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-xl p-3 mb-3 text-sm space-y-1">
                  <p>
                    <span className="text-gray-500">Account name: </span>
                    <span className="font-medium">{meta?.accountName ?? '—'}</span>
                  </p>
                  <p>
                    <span className="text-gray-500">Account number: </span>
                    <span className="font-medium">{meta?.accountNumber ?? '—'}</span>
                  </p>
                  <p>
                    <span className="text-gray-500">Bank code: </span>
                    <span className="font-medium">{meta?.bankCode ?? '—'}</span>
                  </p>
                </div>

                <PayoutActions transactionId={payout.id} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
    }
