import { createClient } from '@/lib/supabase/server';
import { VendorDetailActions } from './VendorDetailActions';

function naira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString('en-NG')}`;
}

export default async function AdminVendorDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: vendor } = await supabase
    .from('vendors')
    .select('id, user_id, business_name, description, status, kyc_bank_account_name, kyc_bank_account_number, kyc_bank_code, commission_rate, rating, review_count, created_at')
    .eq('id', params.id)
    .single();

  if (!vendor) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <p className="text-center text-[#A8B0C5] py-16">Vendor not found.</p>
      </div>
    );
  }

  const { data: owner } = await supabase
    .from('profiles')
    .select('username, full_name, phone, phone_verified, avatar_url, bio')
    .eq('id', vendor.user_id)
    .single();

  const { data: wallet } = await supabase
    .from('wallets')
    .select('balance_kobo')
    .eq('user_id', vendor.user_id)
    .single();

  const { count: productCount } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('vendor_id', vendor.id);

  const { count: activeProductCount } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('vendor_id', vendor.id)
    .eq('status', 'active');

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      {/* Vendor Profile Card */}
      <div className="bg-gradient-to-br from-[#142850] to-[#1B2F5E] border border-[#D4AF37]/25 rounded-2xl shadow-[0_4px_20px_rgba(212,175,55,0.08)] p-5">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h1 className="text-xl font-bold text-[#F5F7FA]">{vendor.business_name}</h1>
            <p className="text-xs text-[#A8B0C5]">Owner: @{owner?.username ?? '—'} ({owner?.full_name ?? '—'})</p>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
            vendor.status === 'approved' 
              ? 'bg-[#2ED573]/20 text-[#2ED573] border border-[#2ED573]/40' 
              : 'bg-[#D4AF37]/20 text-[#E8C874] border border-[#D4AF37]/40'
          }`}>
            {vendor.status}
          </span>
        </div>

        {vendor.description && (
          <p className="text-sm text-[#A8B0C5] mt-2 mb-4">{vendor.description}</p>
        )}

        {/* Bank & Financials Grid */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-[#0A1931]/60 border border-[#D4AF37]/15 rounded-xl p-3">
            <p className="text-[11px] text-[#A8B0C5] uppercase tracking-wider">Wallet Balance</p>
            <p className="text-lg font-black text-[#D4AF37] mt-0.5">{naira(wallet?.balance_kobo ?? 0)}</p>
          </div>
          <div className="bg-[#0A1931]/60 border border-[#D4AF37]/15 rounded-xl p-3">
            <p className="text-[11px] text-[#A8B0C5] uppercase tracking-wider">Active Products</p>
            <p className="text-lg font-black text-[#D4AF37] mt-0.5">{activeProductCount ?? 0} / {productCount ?? 0}</p>
          </div>
        </div>

        {/* Bank details */}
        <div className="bg-[#0A1931]/60 border border-[#D4AF37]/15 rounded-xl p-3.5 mt-3 space-y-1.5 text-xs">
          <p><span className="text-[#A8B0C5]">Bank Name: </span><span className="font-semibold text-[#F5F7FA]">{vendor.kyc_bank_account_name ?? '—'}</span></p>
          <p><span className="text-[#A8B0C5]">Account Number: </span><span className="font-mono font-bold text-[#E8C874]">{vendor.kyc_bank_account_number ?? '—'}</span> <span className="text-[#A8B0C5]">({vendor.kyc_bank_code ?? '—'})</span></p>
          <p><span className="text-[#A8B0C5]">Commission Rate: </span><span className="font-semibold text-[#F5F7FA]">{((vendor.commission_rate ?? 0.1) * 100).toFixed(0)}%</span></p>
        </div>

        <div className="mt-5 pt-3 border-t border-[#D4AF37]/15">
          <VendorDetailActions vendorId={vendor.id} status={vendor.status} />
        </div>
      </div>
    </div>
  );
}
