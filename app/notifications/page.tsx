import { createClient } from '@/lib/supabase/server';
import { NotificationsList } from '@/components/NotificationsList';

export default async function NotificationsPage() {
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

  const { data: notifications } = await supabase
    .from('notifications')
    .select('id, type, title, body, link, read_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-[#0F172A] px-4 py-5">
        <h1 className="text-xl font-bold text-white">
          <span className="text-[#D4AF37]">Notifications</span>
        </h1>
      </div>

      <NotificationsList notifications={notifications ?? []} />
    </div>
  );
           }
                          
