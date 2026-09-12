import { createClient } from '@/lib/supabase/server';
import { VendorActions } from './VendorActions';

export default async function AdminVendorsPage() {
  const supabase = createClient();

  const { data: vendors } = await supabase
    .from('vendors')
    .select('id, business_name, description, kyc_bank_account_name, kyc_bank_account_number, kyc_bank_code, status, created_at')
    .in('status', ['pending', 'under_review'])
    .order('created_at', { ascending: true });

  return (
    <div className="max-w-2xl mx-auto p-4">
      {(!vendors || vendors.length === 0) ? (
        <p className="text-center text-gray-500 py-16">No vendor applications pending.</p>
      ) : (
        <div className="space-y-3">
          {vendors.map((v) => (
            <div key={v.id} className="bg-white rounded-2xl shadow-sm p-4">
              <p className="font-semibold text-[#0F172A]">{v.business_name}</p>
              {v.description && <p className="text-sm text-gray-600 mt-1">{v.description}</p>}

              <div className="bg-gray-50 rounded-xl p-3 mt-3 text-sm space-y-1">
                <p><span className="text-gray-500">Bank: </span>{v.kyc_bank_account_name ?? '—'}</p>
                <p><span className="text-gray-500">Account: </span>{v.kyc_bank_account_number ?? '—'} ({v.kyc_bank_code ?? '—'})</p>
              </div>

              <p className="text-xs text-gray-400 mt-2">
                Applied {new Date(v.created_at).toLocaleDateString()}
              </p>

              <div className="mt-3">
                <VendorActions vendorId={v.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
    }
