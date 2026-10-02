'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default function BecomeVendorPage() {
  const router = useRouter();
  const supabase = createClient();

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
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError('You must be logged in.');
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from('vendors').insert({
      user_id: user.id,
      business_name: businessName.trim(),
      slug: slugify(businessName),
      description: description.trim() || null,
      kyc_bank_code: bankCode.trim(),
      kyc_bank_account_number: bankAccountNumber.trim(),
      kyc_bank_account_name: bankAccountName.trim(),
    });

    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    router.push('/profile');
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#0A1A3A] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(233,200,106,0.12),rgba(255,255,255,0))] text-[#F5EAC2] p-4 pb-28">
      <div className="max-w-md mx-auto bg-gradient-to-b from-[#1E3A7A] to-[#142A5E] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.45),0_0_20px_rgba(233,200,106,0.15)] border border-[#E9C86A]/60 p-6 text-[#F5EAC2] mt-6">
        <h1 className="text-2xl font-serif font-bold text-[#E9C86A] mb-1 tracking-wide">
          Register as Vendor
        </h1>
        <p className="text-sm text-[#E9C86A]/80 mb-6 font-medium">
          Set up your store on SwiftMart
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-[#E9C86A] mb-1 block">
              Business name
            </label>
            <input
              type="text"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full rounded-xl border border-[#E9C86A]/40 bg-[#0F2550] text-[#F5EAC2] placeholder-[#E9C86A]/40 p-3 focus:border-[#E9C86A] focus:shadow-[0_0_15px_rgba(233,200,106,0.3)] outline-none transition-all"
              placeholder="e.g. Kenny's Fashion Hub"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-[#E9C86A] mb-1 block">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-[#E9C86A]/40 bg-[#0F2550] text-[#F5EAC2] placeholder-[#E9C86A]/40 p-3 focus:border-[#E9C86A] focus:shadow-[0_0_15px_rgba(233,200,106,0.3)] outline-none resize-none transition-all"
              placeholder="What do you sell?"
            />
          </div>

          <div className="pt-2">
            <p className="text-base font-serif font-bold text-[#E9C86A] mb-3 tracking-wide">
              Payout bank details
            </p>

            <label className="text-sm font-semibold text-[#E9C86A] mb-1 block">
              Bank code
            </label>
            <input
              type="text"
              required
              value={bankCode}
              onChange={(e) => setBankCode(e.target.value)}
              className="w-full rounded-xl border border-[#E9C86A]/40 bg-[#0F2550] text-[#F5EAC2] placeholder-[#E9C86A]/40 p-3 mb-3 focus:border-[#E9C86A] focus:shadow-[0_0_15px_rgba(233,200,106,0.3)] outline-none transition-all"
              placeholder="e.g. 058 (GTBank)"
            />

            <label className="text-sm font-semibold text-[#E9C86A] mb-1 block">
              Account number
            </label>
            <input
              type="text"
              required
              value={bankAccountNumber}
              onChange={(e) => setBankAccountNumber(e.target.value)}
              className="w-full rounded-xl border border-[#E9C86A]/40 bg-[#0F2550] text-[#F5EAC2] placeholder-[#E9C86A]/40 p-3 mb-3 focus:border-[#E9C86A] focus:shadow-[0_0_15px_rgba(233,200,106,0.3)] outline-none transition-all"
              placeholder="10-digit account number"
            />

            <label className="text-sm font-semibold text-[#E9C86A] mb-1 block">
              Account name
            </label>
            <input
              type="text"
              required
              value={bankAccountName}
              onChange={(e) => setBankAccountName(e.target.value)}
              className="w-full rounded-xl border border-[#E9C86A]/40 bg-[#0F2550] text-[#F5EAC2] placeholder-[#E9C86A]/40 p-3 focus:border-[#E9C86A] focus:shadow-[0_0_15px_rgba(233,200,106,0.3)] outline-none transition-all"
              placeholder="Must match your bank account"
            />
          </div>

          {error && <p className="text-sm text-red-400 font-medium">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 bg-gradient-to-r from-[#F2D57E] to-[#D4A937] text-[#0A1931] font-extrabold py-3.5 px-6 rounded-2xl shadow-[0_0_20px_rgba(233,200,106,0.4)] hover:shadow-[0_0_25px_rgba(233,200,106,0.6)] active:scale-[0.99] transition disabled:opacity-50 tracking-wide"
          >
            {loading ? 'Submitting...' : 'Register as Vendor'}
          </button>
        </form>
      </div>
    </div>
  );
}
