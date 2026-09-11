'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import LogoutButton from '@/components/LogoutButton';

export default function ProfilePage() {
  const supabase = createClient();
  const [email, setEmail] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [vendor, setVendor] = useState<{ business_name: string; status: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setEmail(user.email ?? null);
        setUsername((user.user_metadata?.username as string) ?? null);

        const { data: vendorRow } = await supabase
          .from('vendors')
          .select('business_name, status')
          .eq('user_id', user.id)
          .single();
        setVendor(vendorRow);
      }
      setLoading(false);
    }
    loadUser();
  }, [supabase]);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm p-6 mt-6">
        <h1 className="text-xl font-semibold text-[#0F172A] mb-6">Profile</h1>

        <div className="mb-2">
          <p className="text-sm text-gray-500">Username</p>
          <p className="text-base text-gray-900">{username ?? '—'}</p>
        </div>

        <div className="mb-6">
          <p className="text-sm text-gray-500">Email</p>
          <p className="text-base text-gray-900">{email ?? '—'}</p>
        </div>

        {!loading && (
          <div className="mb-6">
            {vendor ? (
              <Link
                href="/vendor"
                className="block text-center bg-[#0F172A] text-[#D4AF37] font-bold py-3 rounded-xl border-2 border-[#D4AF37]"
              >
                Go to Vendor Dashboard
              </Link>
            ) : (
              <Link
                href="/vendor/register"
                className="block text-center bg-white text-[#0F172A] font-bold py-3 rounded-xl border-2 border-[#0F172A]"
              >
                Become a Vendor
              </Link>
            )}
          </div>
        )}

        <LogoutButton />
      </div>
    </div>
  );
  }
    
