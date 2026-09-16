import { createClient } from '@/lib/supabase/server';
import { NotificationItem } from '@/components/NotificationItem';

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
    .select('id, title, body, link, read_at, created_at')
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

      {(!notifications || notifications.length === 0) ? (
        <p className="text-center text-gray-500 py-20">No notifications yet.</p>
      ) : (
        <div className="bg-white mt-2">
          {notifications.map((n) => (
            <NotificationItem
              key={n.id}
              id={n.id}
              title={n.title}
              body={n.body}
              link={n.link}
              readAt={n.read_at}
              createdAt={n.created_at}
            />
          ))}
        </div>
      )}
    </div>
  );
      }
    
