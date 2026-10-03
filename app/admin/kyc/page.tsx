import { createClient } from '@/lib/supabase/server';
import { ShieldAlert, CheckCircle2, Clock } from 'lucide-react';

export default async function AdminKYCPage() {
  const supabase = createClient();

  // Fetch vendors with status
  const { data: vendors } = await supabase
    .from('vendors')
    .select('id, name, business_name, status, created_at')
    .in('status', ['pending', 'under_review', 'active', 'rejected'])
    .order('created_at', { ascending: false })
    .limit(30);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#D4AF37]">KYC & Compliance Verification</h2>
          <p className="text-xs sm:text-sm text-[#A8B0C5]">
            Merchant verification (mandatory NIN & optional CAC) and customer identity compliance.
          </p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-[#142850] to-[#1B2F5E] border border-[#D4AF37]/25 rounded-2xl p-5 shadow-[0_4px_20px_rgba(212,175,55,0.08)]">
        <h3 className="text-sm font-bold text-[#D4AF37] uppercase tracking-wider mb-3">
          Merchant KYC Queue
        </h3>
        <div className="divide-y divide-[#D4AF37]/15">
          {(vendors ?? []).length === 0 ? (
            <p className="py-6 text-center text-xs text-[#A8B0C5]">No KYC submissions pending.</p>
          ) : (
            vendors?.map((v) => (
              <div key={v.id} className="py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-sm text-[#F5F7FA]">{v.business_name || v.name}</p>
                  <p className="text-xs text-[#A8B0C5]">
                    Submitted: {new Date(v.created_at).toLocaleDateString('en-NG')} · Status:{' '}
                    <span className="text-[#E8C874] capitalize">{v.status}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#0F2550] border border-[#D4AF37]/30 text-[#D4AF37]">
                    NIN Verification Required
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
