'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function CreateVendorForm() {
  const supabase = createClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const { data, error: fnError } = await supabase.functions.invoke('admin-actions', {
      body: { type: 'admin_create_vendor', username: username.replace(/^@/, ''), businessName },
    });

    setLoading(false);
    if (fnError) return setError(fnError.message);
    if (data?.error) return setError(data.error);

    setSuccess(`${businessName} added as a vendor.`);
    setUsername('');
    setBusinessName('');
    router.refresh();
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <button
        onClick={() => setOpen(!open)}
        className="text-sm font-semibold text-[#0F172A]"
      >
        {open ? '− Manually add a vendor' : '+ Manually add a vendor'}
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="mt-3 space-y-3">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Their username"
            required
            className="w-full rounded-xl border-2 border-gray-200 p-2.5 text-sm focus:border-[#D4AF37] outline-none"
          />
          <input
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Business name"
            required
            className="w-full rounded-xl border-2 border-gray-200 p-2.5 text-sm focus:border-[#D4AF37] outline-none"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          {success && <p className="text-xs text-green-600">{success}</p>}
          <button
            type="submit"
            disabled={loading}
            className="bg-[#0F172A] text-[#D4AF37] text-sm font-semibold px-4 py-2 rounded-lg border border-[#D4AF37] disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Add as Vendor'}
          </button>
        </form>
      )}
    </div>
  );
    }
    
