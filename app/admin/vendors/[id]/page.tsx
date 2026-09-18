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
        <p className="text-center text-gray-500 py-16">Vendor not found.</p>
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

  const { data: soldSum } = await supabase
    .from('products')
    .select('sold_count')
    .eq('vendor_id', vendor.id);
  const totalSold = (soldSum ?? []).reduce((sum, p) => sum + (p.sold_count ?? 0), 0);

  const { data: revenueRows } = await supabase
    .from('order_items')
    .select('vendor_payout_kobo')
    .eq('vendor_id', vendor.id);
  const totalRevenue = (revenueRows ?? []).reduce((sum, r) => sum + (r.vendor_payout_kobo ?? 0), 0);

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
        <div className="flex items-center gap-3 mb-4">
          {owner?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={owner.avatar_url} alt="" className="h-14 w-14 rounded-full object-cover" />
          ) : (
            <div className="h-14 w-14 rounded-full bg-gray-200" />
          )}
          <div>
            <h1 className="text-lg font-bold text-[#0F172A]">{vendor.business_name}</h1>
            <p className="text-sm text-gray-500">@{owner?.username ?? 'unknown'}</p>
            <p className={`text-xs mt-0.5 font-semibold capitalize ${
              vendor.status === 'approved' ? 'text-green-600'
              : vendor.status === 'suspended' || vendor.status === 'rejected' ? 'text-red-600'
              : 'text-amber-600'
            }`}>
              {vendor.status}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500">Wallet balance</p>
            <p className="text-lg font-bold text-[#0F172A]">{naira(wallet?.balance_kobo ?? 0)}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500">Total earned</p>
            <p className="text-lg font-bold text-[#0F172A]">{naira(totalRevenue)}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500">Products (active / total)</p>
            <p className="text-lg font-bold text-[#0F172A]">{activeProductCount ?? 0} / {productCount ?? 0}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500">Items sold</p>
            <p className="text-lg font-bold text-[#0F172A]">{totalSold}</p>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-1">Rating</p>
          <p className="text-sm">
            {vendor.review_count > 0 ? `⭐ ${vendor.rating.toFixed(1)} (${vendor.review_count} reviews)` : 'No reviews yet'}
          </p>
        </div>

        <div className="border-t border-gray-100 pt-4 mb-4">
          <p className="text-xs font-semibold text-gray-500 mb-2">Profile details</p>
          <div className="text-sm space-y-1">
            <p><span className="text-gray-500">Full name: </span>{owner?.full_name ?? '—'}</p>
            <p><span className="text-gray-500">Phone: </span>{owner?.phone ?? '—'} {owner?.phone_verified ? '✓ verified' : ''}</p>
            <p><span className="text-gray-500">Bio: </span>{owner?.bio ?? '—'}</p>
            <p className="text-gray-400 text-xs mt-2">
              Gender, date of birth, nationality, address, and ID/selfie KYC are not collected yet — pending the full KYC upgrade.
            </p>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4 mb-4">
          <p className="text-xs font-semibold text-gray-500 mb-2">Payout bank details</p>
          <div className="text-sm space-y-1">
            <p><span className="text-gray-500">Account name: </span>{vendor.kyc_bank_account_name ?? '—'}</p>
            <p><span className="text-gray-500">Account number: </span>{vendor.kyc_bank_account_number ?? '—'}</p>
            <p><span className="text-gray-500">Bank code: </span>{vendor.kyc_bank_code ?? '—'}</p>
            <p><span className="text-gray-500">Commission rate: </span>{vendor.commission_rate}%</p>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4 mb-4">
          <p className="text-xs text-gray-400">
            Applied {new Date(vendor.created_at).toLocaleDateString()}
          </p>
        </div>

        <VendorDetailActions vendorId={vendor.id} status={vendor.status} />
      </div>
    </div>
  );
    }
  
