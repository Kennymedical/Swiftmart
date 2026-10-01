import { createClient } from '@/lib/supabase/server';
import { NotificationsList } from '@/components/NotificationsList';

export default async function NotificationsPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A1028] p-4 text-[#D4AF37]">
        <p>Please log in.</p>
      </div>
    );
  }

  const { data: notifications } = await supabase
    .from('notifications')
    .select('id, type, title, body, link, read_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <div className="min-h-screen bg-[#0A1028] text-white pb-24">
      <NotificationsList notifications={notifications ?? []} />
    </div>
  );
}
