import { createClient } from '@/lib/supabase/server';
import { VendorActions } from './VendorActions';
import { VendorSearch } from '@/components/VendorSearch';
import { CreateVendorForm } from '@/components/CreateVendorForm';

export default async function AdminVendorsPage() {
  const supabase = createClient();

  const { data: vendors } = await supabase
    .from('vendors')
    .select('id, business_name, description, kyc_bank_account_name, kyc_bank_account_number, kyc_bank_code, status, created_at')
    .in('status', ['pending', 'under_review'])
    .order('created_at', { ascending: true });

  return (
    <div>
      <VendorSearch />

      <div className="max-w-2xl mx-auto p-4">
        <CreateVendorForm />

        <h2 className="text-xs font-bold uppercase tracking-wider text-[#D4AF37] mb-3 mt-6 px-1">
          Pending Applications
        </h2>
        {(!vendors || vendors.length === 0) ? (
          <p className="text-center text-[#A8B0C5] py-16">No vendor applications pending.</p>
        ) : (
          <div className="space-y-3.5">
            {vendors.map((v) => (
              <div
                key={v.id}
                className="bg-gradient-to-br from-[#142850] to-[#1B2F5E] border border-[#D4AF37]/25 rounded-2xl shadow-[0_4px_20px_rgba(212,175,55,0.08)] p-5"
              >
                <p className="font-bold text-lg text-[#F5F7FA]">{v.business_name}</p>
                {v.description && <p className="text-sm text-[#A8B0C5] mt-1">{v.description}</p>}

                <div className="bg-[#0A1931]/60 border border-[#D4AF37]/15 rounded-xl p-3.5 mt-3 text-sm space-y-1.5">
                  <p>
                    <span className="text-[#A8B0C5]">Bank: </span>
                    <span className="font-semibold text-[#F5F7FA]">{v.kyc_bank_account_name ?? '—'}</span>
                  </p>
                  <p>
                    <span className="text-[#A8B0C5]">Account: </span>
                    <span className="font-mono font-bold text-[#E8C874]">
                      {v.kyc_bank_account_number ?? '—'}
                    </span>{' '}
                    <span className="text-[#A8B0C5]">({v.kyc_bank_code ?? '—'})</span>
                  </p>
                </div>

                <p className="text-xs text-[#A8B0C5] mt-2.5">
                  Applied {new Date(v.created_at).toLocaleDateString()}
                </p>

                <div className="mt-4 pt-3 border-t border-[#D4AF37]/15">
                  <VendorActions vendorId={v.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
