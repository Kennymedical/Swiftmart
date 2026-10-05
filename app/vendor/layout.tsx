import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=/vendor');
  }

  return (
    <div className="min-h-screen bg-[#0A1A3A] text-[#F5EAC2]">
      {children}
    </div>
  );
}
