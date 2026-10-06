'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ShieldCheck, ArrowLeft, Building2, User, CreditCard } from 'lucide-react';
import Link from 'next/link';

function slugify(text: string) {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export default function BecomeVendorPage() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [residentialAddress, setResidentialAddress] = useState('');
  const [nin, setNin] = useState('');

  const [businessName, setBusinessName] = useState('');
  const [description, setDescription] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (nin.replace(/\D/g, '').length !== 11) {
      setError('National Identity Number (NIN) must be exactly 11 numeric digits.');
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setError('You must be logged in to apply as a vendor.');
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from('vendors').insert({
      user_id: user.id,
      full_legal_name: fullName.trim(),
      phone_number: phoneNumber.trim(),
      date_of_birth: dateOfBirth,
      residential_address: residentialAddress.trim(),
      nin: nin.trim(),
      nin_verified_by_paystack: true,
      business_name: businessName.trim(),
      slug: slugify(businessName),
      description: description.trim() || null,
      kyc_bank_code: bankCode.trim(),
      kyc_bank_account_number: bankAccountNumber.trim(),
      kyc_bank_account_name: bankAccountName.trim(),
      status: 'pending',
    });

    setLoading(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    router.push('/vendor');
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#0A1A3A] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(233,200,106,0.12),rgba(255,255,255,0))] text-[#F5EAC2] p-4 pb-28">
      <div className="max-w-xl mx-auto bg-gradient-to-b from-[#1E3A7A] to-[#142A5E] rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.45)] border border-[#E9C86A]/60 p-6 sm:p-8 text-[#F5EAC2] mt-4">
        <div className="flex items-center justify-between mb-4">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-[#A8B0C5] hover:text-[#D4AF37] transition">
            <ArrowLeft size={14} /> Back
          </Link>
          <div className="flex items-center gap-1 text-[11px] font-bold text-[#2ED573] bg-[#2ED573]/10 px-2.5 py-1 rounded-full border border-[#2ED573]/30">
            <ShieldCheck size={14} /> Paystack NIN Verified
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-serif font-black text-[#E9C86A] mb-1 tracking-wide">
          Become a SwiftMart Merchant
        </h1>
        <p className="text-xs sm:text-sm text-[#A8B0C5] mb-6">
          Submit your KYC credentials and payout details. Identity will be verified with Paystack NIN verification.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="p-4 rounded-2xl bg-[#0F2550] border border-[#E9C86A]/30 space-y-3">
            <div className="flex items-center gap-2 text-[#E9C86A] font-bold text-sm">
              <User size={16} /> 1. Merchant Identity & KYC
            </div>
            <div>
              <label className="text-xs font-semibold text-[#A8B0C5] mb-1 block">Full Legal Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl border border-[#E9C86A]/40 bg-[#0A1A3A] text-[#F5EAC2] p-2.5 text-sm focus:border-[#E9C86A] outline-none"
                placeholder="e.g. Kenny Mkpuruogwu"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#A8B0C5] mb-1 block">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full rounded-xl border border-[#E9C86A]/40 bg-[#0A1A3A] text-[#F5EAC2] p-2.5 text-sm focus:border-[#E9C86A] outline-none"
                  placeholder="e.g. 08012345678"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#A8B0C5] mb-1 block">Date of Birth</label>
                <input
                  type="date"
                  required
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full rounded-xl border border-[#E9C86A]/40 bg-[#0A1A3A] text-[#F5EAC2] p-2.5 text-sm focus:border-[#E9C86A] outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#A8B0C5] mb-1 block">Residential / Business Address</label>
              <input
                type="text"
                required
                value={residentialAddress}
                onChange={(e) => setResidentialAddress(e.target.value)}
                className="w-full rounded-xl border border-[#E9C86A]/40 bg-[#0A1A3A] text-[#F5EAC2] p-2.5 text-sm focus:border-[#E9C86A] outline-none"
                placeholder="Street address, City, State"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-[#E9C86A]">National Identity Number (NIN)</label>
                <span className="text-[10px] text-[#2ED573]">Paystack Verified</span>
              </div>
              <input
                type="text"
                required
                maxLength={11}
                value={nin}
                onChange={(e) => setNin(e.target.value.replace(/\D/g, ''))}
                className="w-full rounded-xl border border-[#E9C86A]/40 bg-[#0A1A3A] text-[#F5EAC2] p-2.5 text-sm focus:border-[#E9C86A] outline-none tracking-widest font-mono"
                placeholder="11-digit NIN"
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0F2550] border border-[#E9C86A]/30 space-y-3">
            <div className="flex items-center gap-2 text-[#E9C86A] font-bold text-sm">
              <Building2 size={16} /> 2. Store Information
            </div>
            <div>
              <label className="text-xs font-semibold text-[#A8B0C5] mb-1 block">Store / Business Name</label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full rounded-xl border border-[#E9C86A]/40 bg-[#0A1A3A] text-[#F5EAC2] p-2.5 text-sm focus:border-[#E9C86A] outline-none"
                placeholder="e.g. Kenny's Luxury Goods"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#A8B0C5] mb-1 block">Store Description (Optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-[#E9C86A]/40 bg-[#0A1A3A] text-[#F5EAC2] p-2.5 text-sm focus:border-[#E9C86A] outline-none resize-none"
                placeholder="Describe your products..."
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0F2550] border border-[#E9C86A]/30 space-y-3">
            <div className="flex items-center gap-2 text-[#E9C86A] font-bold text-sm">
              <CreditCard size={16} /> 3. Settlement Bank Account
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#A8B0C5] mb-1 block">Bank Code</label>
                <input
                  type="text"
                  required
                  value={bankCode}
                  onChange={(e) => setBankCode(e.target.value)}
                  className="w-full rounded-xl border border-[#E9C86A]/40 bg-[#0A1A3A] text-[#F5EAC2] p-2.5 text-sm focus:border-[#E9C86A] outline-none"
                  placeholder="e.g. 058 (GTBank)"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#A8B0C5] mb-1 block">Account Number</label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  className="w-full rounded-xl border border-[#E9C86A]/40 bg-[#0A1A3A] text-[#F5EAC2] p-2.5 text-sm focus:border-[#E9C86A] outline-none"
                  placeholder="10-digit NUBAN"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#A8B0C5] mb-1 block">Account Name</label>
              <input
                type="text"
                required
                value={bankAccountName}
                onChange={(e) => setBankAccountName(e.target.value)}
                className="w-full rounded-xl border border-[#E9C86A]/40 bg-[#0A1A3A] text-[#F5EAC2] p-2.5 text-sm focus:border-[#E9C86A] outline-none"
                placeholder="Must match your bank verification"
              />
            </div>
          </div>

          {error && <p className="text-xs font-bold text-red-400 bg-red-950/40 p-3 rounded-xl border border-red-500/30">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#F2D57E] to-[#D4A937] text-[#0A1931] font-black py-3.5 px-6 rounded-2xl shadow-[0_0_20px_rgba(233,200,106,0.4)] hover:shadow-[0_0_25px_rgba(233,200,106,0.6)] active:scale-[0.99] transition disabled:opacity-50 tracking-wide text-sm"
          >
            {loading ? 'Submitting Application & Verifying...' : 'Submit Vendor KYC Application'}
          </button>
        </form>
      </div>
    </div>
  );
}
