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
    <div className="min-h-screen bg-gray-50 p-4 pb-24">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm p-6 mt-6">
        <h1 className="text-xl font-semibold text-[#0F172A] mb-1">
          Become a Vendor
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Set up your store on SwiftMart
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Business name
            </label>
            <input
              type="text"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full rounded-xl border-2 border-gray-200 p-3 focus:border-[#D4AF37] outline-none"
              placeholder="e.g. Kenny's Fashion Hub"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-xl border-2 border-gray-200 p-3 focus:border-[#D4AF37] outline-none resize-none"
              placeholder="What do you sell?"
            />
          </div>

          <div className="pt-2">
            <p className="text-sm font-semibold text-[#0F172A] mb-2">
              Payout bank details
            </p>

            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Bank code
            </label>
            <input
              type="text"
              required
              value={bankCode}
              onChange={(e) => setBankCode(e.target.value)}
              className="w-full rounded-xl border-2 border-gray-200 p-3 mb-3 focus:border-[#D4AF37] outline-none"
              placeholder="e.g. 058 (GTBank)"
            />

            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Account number
            </label>
            <input
              type="text"
              required
              value={bankAccountNumber}
              onChange={(e) => setBankAccountNumber(e.target.value)}
              className="w-full rounded-xl border-2 border-gray-200 p-3 mb-3 focus:border-[#D4AF37] outline-none"
              placeholder="10-digit account number"
            />

            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Account name
            </label>
            <input
              type="text"
              required
              value={bankAccountName}
              onChange={(e) => setBankAccountName(e.target.value)}
              className="w-full rounded-xl border-2 border-gray-200 p-3 focus:border-[#D4AF37] outline-none"
              placeholder="Must match your bank account"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0F172A] text-[#D4AF37] font-bold py-3 rounded-xl border-2 border-[#D4AF37] hover:bg-[#1E293B] transition disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Register as Vendor'}
          </button>
        </form>
      </div>
    </div>
  );
    }

