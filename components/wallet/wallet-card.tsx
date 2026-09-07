import Link from 'next/link';
import { formatNaira } from '@/lib/format';

interface WalletCardProps {
  balanceKobo: number;
  virtualAccountNumber: string | null;
  virtualAccountBank: string | null;
  children?: React.ReactNode;
}

export function WalletCard({
  balanceKobo,
  virtualAccountNumber,
  virtualAccountBank,
  children,
}: WalletCardProps) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 p-5 text-white shadow-lg">
      <p className="text-sm text-blue-100">SwiftMart Wallet Balance</p>
      <p className="mt-1 text-3xl font-bold">{formatNaira(balanceKobo)}</p>

      {virtualAccountNumber ? (
        <div className="mt-3 rounded-lg bg-white/10 px-3 py-2">
          <p className="text-xs text-blue-100">Fund by bank transfer to</p>
          <p className="text-sm font-semibold tracking-wide">
            {virtualAccountNumber} · {virtualAccountBank}
          </p>
        </div>
      ) : (
        children
      )}

      <div className="mt-4 grid grid-cols-3 gap-2">
        <QuickAction href="/wallet/fund" label="Fund" icon="+" />
        <QuickAction href="/wallet/send" label="Send" icon="↗" />
        <QuickAction href="/wallet/history" label="History" icon="≡" />
      </div>
    </div>
  );
}

function QuickAction({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1 rounded-lg bg-white/10 py-3 text-sm font-medium hover:bg-white/20"
    >
      <span className="text-lg leading-none">{icon}</span>
      {label}
    </Link>
  );
}
