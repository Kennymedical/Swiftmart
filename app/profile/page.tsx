'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import LogoutButton from '@/components/LogoutButton';

export default function ProfilePage() {
  const supabase = createClient();
  const [email, setEmail] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setEmail(user.email ?? null);
        setUsername((user.user_metadata?.username as string) ?? null);
      }
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

        <LogoutButton />
      </div>
    </div>
  );
}

