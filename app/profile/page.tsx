import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { LogoutButton } from '@/components/LogoutButton';

export default async function ProfilePage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <p className="text-gray-500">Please log in.</p>
      </div>
    );
  }

  // 1. Fetch the user's profile to check their admin status
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, full_name, is_admin') 
    .eq('id', user.id)
    .single();

  // 2. Check if they are a vendor
  const { data: vendor } = await supabase
    .from('vendors')
    .select('id')
    .eq('user_id', user.id)
    .single();

  const isAdmin = profile?.is_admin === true;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-[#0F172A] px-4 py-8 text-center">
        <h1 className="text-xl font-bold text-white mb-1">
          {profile?.full_name || profile?.username || 'My Profile'}
        </h1>
        <p className="text-[#D4AF37] text-sm">{user.email}</p>
      </div>

      <div className="p-4 max-w-md mx-auto space-y-3 mt-4">
        {/* Vendor Dashboard Button */}
        {vendor && (
          <Link
            href="/vendor"
            className="block text-center bg-[#0F172A] text-[#D4AF37] font-bold py-3 rounded-xl border-2 border-[#D4AF37] shadow-sm hover:opacity-90 transition"
          >
            Go to Vendor Dashboard
          </Link>
        )}

        {/* Become a Vendor Button */}
        {!vendor && (
          <Link
            href="/vendor/register"
            className="block text-center bg-white text-[#0F172A] font-bold py-3 rounded-xl border-2 border-[#0F172A] shadow-sm hover:bg-gray-50 transition"
          >
            Become a Vendor
          </Link>
        )}

        {/* Admin Dashboard Button - Using SwiftMart Navy & Gold */}
        {isAdmin && (
          <Link
            href="/admin"
            className="block text-center bg-[#0F172A] text-[#D4AF37] font-bold py-3 rounded-xl border-2 border-[#D4AF37] shadow-sm hover:opacity-90 transition"
          >
            🛡️ Go to Admin Dashboard
          </Link>
        )}

        <div className="pt-4">
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
