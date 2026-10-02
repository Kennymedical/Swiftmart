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
  const [isAdmin, setIsAdmin] = useState(false);
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

        const { data: profileRow } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        setIsAdmin(profileRow?.role === 'admin');
      }
      setLoading(false);
    }
    loadUser();
  }, [supabase]);

  return (
    <div className="min-h-screen bg-[#0A1931] p-4">
      <div className="max-w-md mx-auto bg-gradient-to-br from-[#142850] to-[#1B2F5E] rounded-2xl p-6 mt-6 border border-[#D4AF37]/25 shadow-[0_4px_20px_rgba(212,175,55,0.08)] text-[#F5F7FA]">
        <h1 className="text-xl font-semibold text-[#E9C86A] mb-6">Profile</h1>

        <div className="mb-2">
          <p className="text-sm text-[#A8B0C5]">Username</p>
          <p className="text-base text-[#F5F7FA]">{username ?? '—'}</p>
        </div>

        <div className="mb-6">
          <p className="text-sm text-[#A8B0C5]">Email</p>
          <p className="text-base text-[#F5F7FA]">{email ?? '—'}</p>
        </div>

        {!loading && (
          <div className="mb-4 space-y-2">
            {isAdmin && (
              <Link
                href="/admin"
                className="block text-center bg-[#D4AF37] text-[#E9C86A] font-bold py-3 rounded-xl"
              >
                Admin Dashboard
              </Link>
            )}

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
                className="block text-center bg-gradient-to-r from-[#D4AF37] to-[#F5C445] text-[#0A1931] font-bold py-3 rounded-xl border-2 border-[#0F172A]"
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
    
