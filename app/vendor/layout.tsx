import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Clock, ShieldAlert, ArrowLeft } from 'lucide-react';

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login?session_expired=true&redirect=/vendor');
  }

  // Fetch vendor status for this user
  const { data: vendor, error: vendorError } = await supabase
    .from('vendors')
    .select('id, business_name, status')
    .eq('user_id', user.id)
    .maybeSingle();

  // If vendor record does not exist
  if (!vendor) {
    return (
      <div className="min-h-screen bg-[#0A1A3A] text-[#F5EAC2] p-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-gradient-to-b from-[#1E3A7A] to-[#142A5E] border border-[#E9C86A]/60 rounded-3xl p-8 text-center shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[#0A1931] border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
            <ShieldAlert size={28} />
          </div>
          <h1 className="text-2xl font-bold text-[#E9C86A] mb-2 tracking-wide">
            Vendor Account Required
          </h1>
          <p className="text-sm text-[#A8B0C5] mb-6">
            You do not currently have a registered vendor profile on SwiftMart.
          </p>
          <div className="space-y-3">
            <Link
              href="/vendor/register"
              className="block w-full py-3 bg-gradient-to-r from-[#F2D57E] to-[#D4A937] text-[#0A1931] font-black rounded-xl hover:opacity-90 transition"
            >
              Apply as a Vendor
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs text-[#A8B0C5] hover:text-[#D4AF37] transition"
            >
              <ArrowLeft size={14} /> Return to Storefront
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // If vendor is waiting for approval or not approved
  if (vendor.status !== 'approved') {
    const isPending = vendor.status === 'pending' || vendor.status === 'under_review';
    return (
      <div className="min-h-screen bg-[#0A1A3A] text-[#F5EAC2] p-4 flex items-center justify-center">
        <div className="max-w-lg w-full bg-gradient-to-b from-[#142850] to-[#0A1931] border-2 border-[#D4AF37]/40 rounded-3xl p-8 text-center shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#0F2140] border border-[#D4AF37]/50 flex items-center justify-center text-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.2)]">
            <Clock size={32} className="animate-pulse" />
          </div>

          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 mb-3">
            Status: {vendor.status.replace('_', ' ')}
          </span>

          <h1 className="text-2xl font-extrabold text-[#F5EAC2] mb-3">
            {isPending ? 'Application Under Review' : 'Account Suspended or Inactive'}
          </h1>

          <p className="text-sm text-[#A8B0C5] mb-6 leading-relaxed">
            {isPending
              ? `Your store "${vendor.business_name}" is currently awaiting administrative approval and KYC verification. The merchant dashboard will unlock immediately once approved by SwiftMart Admin.`
              : `Your vendor account "${vendor.business_name}" is currently not active. Please contact SwiftMart support for resolution.`}
          </p>

          <div className="p-4 rounded-2xl bg-[#0B1528] border border-white/10 text-left text-xs space-y-2 mb-6">
            <div className="flex justify-between text-[#A8B0C5]">
              <span>Store Name:</span>
              <span className="font-semibold text-white">{vendor.business_name}</span>
            </div>
            <div className="flex justify-between text-[#A8B0C5]">
              <span>Review Phase:</span>
              <span className="font-semibold text-[#D4AF37]">KYC & Compliance Audit</span>
            </div>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-[#D4AF37]/40 text-xs font-bold text-[#D4AF37] hover:bg-[#142850] transition"
          >
            <ArrowLeft size={14} /> Back to Shopper Homepage
          </Link>
        </div>
      </div>
    );
  }

  // Approved vendor -> render portal
  return (
    <div className="min-h-screen bg-[#0A1A3A] text-[#F5EAC2]">
      {children}
    </div>
  );
}
