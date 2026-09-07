import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { WalletCard } from '@/components/wallet/wallet-card';
import { TransactionRow } from '@/components/wallet/transaction-row';
import { EnsureVirtualAccount } from '@/components/wallet/ensure-virtual-account';

export default async function WalletPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: wallet } = await supabase
    .from('wallets')
    .select('id, balance_kobo, virtual_account_number, virtual_account_bank')
    .eq('user_id', user.id)
    .single();

  const { data: recentTransactions } = wallet
    ? await supabase
        .from('transactions')
        .select('id, type, status, amount_kobo, description, created_at')
        .eq('wallet_id', wallet.id)
        .order('created_at', { ascending: false })
        .limit(5)
    : { data: [] };

  return (
    <div className="mx-auto max-w-lg px-4 py-6 pb-20">
      <h1 className="mb-4 text-xl font-bold">Wallet</h1>

      <WalletCard
        balanceKobo={wallet?.balance_kobo ?? 0}
        virtualAccountNumber={wallet?.virtual_account_number ?? null}
        virtualAccountBank={wallet?.virtual_account_bank ?? null}
      >
        <EnsureVirtualAccount hasAccount={!!wallet?.virtual_account_number} />
      </WalletCard>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-500">Recent activity</h2>
          <Link href="/wallet/history" className="text-sm text-blue-600">
            See all
          </Link>
        </div>

        {!recentTransactions || recentTransactions.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">No transactions yet.</p>
        ) : (
          <div className="divide-y rounded-lg border bg-white">
            {recentTransactions.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
