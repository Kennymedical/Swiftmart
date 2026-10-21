import { createClient } from '@/lib/supabase/server';
import { ShieldCheck, ShieldAlert, CheckCircle2, Clock, XCircle, Building2, User } from 'lucide-react';
import { revalidatePath } from 'next/cache';

export default async function AdminKYCPage() {
  const supabase = createClient();

  // Fetch vendors with status and KYC fields
  const { data: vendors } = await supabase
    .from('vendors')
    .select('id, user_id, full_legal_name, business_name, nin, status, kyc_bank_code, kyc_bank_account_number, kyc_bank_account_name, residential_address, phone_number, created_at')
    .in('status', ['pending', 'under_review', 'approved', 'rejected'])
    .order('created_at', { ascending: false })
    .limit(50);

  async function handleReviewAction(formData: FormData) {
    'use server';
    const vendorId = formData.get('vendor_id') as string;
    const decision = formData.get('decision') as string;
    const reason = formData.get('reason') as string;

    const supabaseServer = createClient();
    await supabaseServer.rpc('admin_review_vendor', {
      p_vendor_id: vendorId,
      p_decision: decision,
      p_reason: reason || null,
    });

    revalidatePath('/admin/kyc');
  }

  const maskString = (val?: string | null, keepEnd = 4) => {
    if (!val) return '—';
    const trimmed = val.trim();
    if (trimmed.length <= keepEnd) return trimmed;
    return '*'.repeat(trimmed.length - keepEnd) + trimmed.slice(-keepEnd);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#D4AF37]">KYC & Compliance Verification</h2>
          <p className="text-xs sm:text-sm text-[#A8B0C5]">
            Protected vendor identity records. NIN and settlement bank credentials are fully masked.
          </p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-[#142850] to-[#1B2F5E] border border-[#D4AF37]/25 rounded-2xl p-5 shadow-[0_4px_20px_rgba(212,175,55,0.08)]">
        <h3 className="text-sm font-bold text-[#D4AF37] uppercase tracking-wider mb-4">
          Merchant Applications Queue
        </h3>
        <div className="space-y-4">
          {(vendors ?? []).length === 0 ? (
            <p className="py-6 text-center text-xs text-[#A8B0C5]">No KYC submissions pending.</p>
          ) : (
            vendors?.map((v) => (
              <div
                key={v.id}
                className="p-4 rounded-xl bg-[#0F2140] border border-[#D4AF37]/20 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#F5F7FA]">{v.business_name}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        v.status === 'approved'
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                          : v.status === 'rejected'
                          ? 'bg-rose-950/60 text-rose-400 border border-rose-500/30'
                          : 'bg-amber-950/60 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {v.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-[#A8B0C5] text-[11px] pt-1">
                    <div>
                      <span className="text-[#E8C874] font-semibold">Applicant: </span>
                      {v.full_legal_name || '—'}
                    </div>
                    <div>
                      <span className="text-[#E8C874] font-semibold">Masked NIN: </span>
                      <code className="text-white font-mono">{maskString(v.nin, 4)}</code>
                    </div>
                    <div>
                      <span className="text-[#E8C874] font-semibold">Phone: </span>
                      {v.phone_number || '—'}
                    </div>
                    <div>
                      <span className="text-[#E8C874] font-semibold">Bank: </span>
                      {v.kyc_bank_code ? `Code ${v.kyc_bank_code}` : '—'}
                    </div>
                    <div>
                      <span className="text-[#E8C874] font-semibold">Masked NUBAN: </span>
                      <code className="text-white font-mono">{maskString(v.kyc_bank_account_number, 4)}</code>
                    </div>
                    <div>
                      <span className="text-[#E8C874] font-semibold">Account Name: </span>
                      {v.kyc_bank_account_name || '—'}
                    </div>
                  </div>
                </div>

                {/* Review Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {v.status !== 'approved' && (
                    <form action={handleReviewAction}>
                      <input type="hidden" name="vendor_id" value={v.id} />
                      <input type="hidden" name="decision" value="approved" />
                      <button
                        type="submit"
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-bold text-xs hover:opacity-90 shadow-md transition"
                      >
                        <CheckCircle2 size={14} /> Approve & Notify
                      </button>
                    </form>
                  )}

                  {v.status !== 'rejected' && (
                    <form action={handleReviewAction}>
                      <input type="hidden" name="vendor_id" value={v.id} />
                      <input type="hidden" name="decision" value="rejected" />
                      <input type="hidden" name="reason" value="KYC document mismatch. Please verify your 11-digit NIN and bank details." />
                      <button
                        type="submit"
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1A2640] border border-rose-500/40 text-rose-400 font-bold text-xs hover:bg-rose-950/40 transition"
                      >
                        <XCircle size={14} /> Reject
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
