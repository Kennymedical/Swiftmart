import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { TransactionRow } from '@/components/wallet/transaction-row';

const PAGE_SIZE = 20;

export default async function WalletHistoryPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const page = Math.max(1, Number(searchParams.page ?? '1'));
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: wallet } = await supabase.from('wallets').select('id').eq('user_id', user.id).single();

  const { data: transactions, count } = wallet
    ? await supabase
        .from('transactions')
        .select('id, type, status, amount_kobo, description, created_at', { count: 'exact' })
        .eq('wallet_id', wallet.id)
        .order('created_at', { ascending: false })
        .range(from, to)
    : { data: [], count: 0 };

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  return (
    <div className="mx-auto max-w-lg px-4 py-6 pb-20">
      <div className="mb-4 flex items-center gap-2">
        <Link href="/wallet" className="text-sm text-gray-500">
          ← Wallet
        </Link>
      </div>
      <h1 className="mb-4 text-xl font-bold">Transaction History</h1>

      {!transactions || transactions.length === 0 ? (
        <p className="py-16 text-center text-sm text-gray-400">No transactions yet.</p>
      ) : (
        <div className="divide-y rounded-lg border bg-white">
          {transactions.map((tx) => (
            <TransactionRow key={tx.id} tx={tx} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          {page > 1 && (
            <Link href={`/wallet/history?page=${page - 1}`} className="rounded-md border px-3 py-1.5 text-sm">
              Previous
            </Link>
          )}
          <span className="px-3 py-1.5 text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link href={`/wallet/history?page=${page + 1}`} className="rounded-md border px-3 py-1.5 text-sm">
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
