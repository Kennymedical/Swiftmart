import { createClient } from '@/lib/supabase/server';
import { Users, Shield, Wallet } from 'lucide-react';

function naira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString('en-NG')}`;
}

export default async function AdminUsersPage() {
  const supabase = createClient();

  // Fetch profiles joined with wallets
  const [{ data: profiles }, { data: wallets }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, phone, role, created_at')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase.from('wallets').select('user_id, balance_kobo'),
  ]);

  const walletMap = new Map<string, number>();
  (wallets ?? []).forEach((w) => walletMap.set(w.user_id, w.balance_kobo));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#D4AF37]">Customer & User Directory</h2>
          <p className="text-xs sm:text-sm text-[#A8B0C5]">
            Registered marketplace shoppers, fintech wallet accounts, and access tiers.
          </p>
        </div>
        <div className="px-3.5 py-1.5 rounded-xl bg-[#142850] border border-[#D4AF37]/30 text-xs text-[#E8C874] font-bold">
          Total Users: {(profiles ?? []).length}
        </div>
      </div>

      <div className="bg-gradient-to-br from-[#142850] to-[#1B2F5E] border border-[#D4AF37]/25 rounded-2xl shadow-[0_4px_20px_rgba(212,175,55,0.08)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#0A1931]/80 text-[#D4AF37] uppercase text-[10px] tracking-wider border-b border-[#D4AF37]/20">
              <tr>
                <th className="p-3.5">User</th>
                <th className="p-3.5">Phone / Contact</th>
                <th className="p-3.5">Fintech Tier</th>
                <th className="p-3.5">Wallet Balance</th>
                <th className="p-3.5">Registered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D4AF37]/15">
              {(profiles ?? []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-[#A8B0C5]">
                    No registered customers found.
                  </td>
                </tr>
              ) : (
                profiles?.map((u) => {
                  const bal = walletMap.get(u.id) ?? 0;
                  return (
                    <tr key={u.id} className="hover:bg-white/[0.02] transition">
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#0F2550] border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] font-bold text-xs">
                            {u.full_name ? u.full_name[0].toUpperCase() : 'U'}
                          </div>
                          <div>
                            <p className="font-bold text-[#F5F7FA]">{u.full_name || 'Unnamed User'}</p>
                            <p className="text-[10px] text-[#A8B0C5]">{u.id.slice(0, 10)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 text-[#F5EAC2]">{u.phone || 'No phone set'}</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#0F2550] border border-[#D4AF37]/20 text-[#E8C874]">
                          {u.role === 'admin' ? 'Admin' : u.role === 'vendor' ? 'Merchant' : 'Tier 1 Customer'}
                        </span>
                      </td>
                      <td className="p-3.5 font-bold text-[#D4AF37]">{naira(bal)}</td>
                      <td className="p-3.5 text-xs text-[#A8B0C5]">
                        {new Date(u.created_at).toLocaleDateString('en-NG')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
