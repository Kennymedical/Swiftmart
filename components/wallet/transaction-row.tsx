import { formatNaira } from '@/lib/format';

interface Transaction {
  id: string;
  type: string;
  status: string;
  amount_kobo: number;
  description: string;
  created_at: string;
}

const CREDIT_TYPES = new Set(['wallet_funding', 'escrow_release', 'p2p_receive']);

const TYPE_LABELS: Record<string, string> = {
  wallet_funding: 'Wallet funding',
  order_payment: 'Order payment',
  escrow_hold: 'Payment held in escrow',
  escrow_release: 'Escrow released',
  escrow_refund: 'Refund',
  commission: 'Platform commission',
  payout: 'Bank withdrawal',
  p2p_send: 'Sent',
  p2p_receive: 'Received',
};

export function TransactionRow({ tx }: { tx: Transaction }) {
  const isCredit = CREDIT_TYPES.has(tx.type);

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div>
        <p className="text-sm font-medium">{TYPE_LABELS[tx.type] ?? tx.type}</p>
        <p className="text-xs text-[#A8B0C5]">{tx.description}</p>
        <p className="text-xs text-[#A8B0C5]">{new Date(tx.created_at).toLocaleString()}</p>
      </div>
      <div className="text-right">
        <p className={`text-sm font-semibold ${isCredit ? 'text-green-600' : 'text-[#F5EAC2]'}`}>
          {isCredit ? '+' : '−'}
          {formatNaira(tx.amount_kobo)}
        </p>
        {tx.status !== 'success' && (
          <p className="text-xs capitalize text-[#A8B0C5]">{tx.status}</p>
        )}
      </div>
    </div>
  );
}
