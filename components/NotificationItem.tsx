'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface Props {
  id: string;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export function NotificationItem({ id, title, body, link, readAt, createdAt }: Props) {
  const supabase = createClient();
  const router = useRouter();

  async function handleClick() {
    if (!readAt) {
      await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
    }
    if (link) router.push(link);
    else router.refresh();
  }

  return (
    <button
      onClick={handleClick}
      className={`w-full text-left p-4 border-b border-gray-100 last:border-0 ${
        !readAt ? 'bg-[#0F172A]/5' : ''
      }`}
    >
      <div className="flex items-start gap-2">
        {!readAt && <span className="mt-1.5 h-2 w-2 rounded-full bg-[#D4AF37] flex-shrink-0" />}
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${!readAt ? 'font-semibold text-[#0F172A]' : 'text-gray-700'}`}>
            {title}
          </p>
          <p className="text-sm text-gray-500 mt-0.5">{body}</p>
          <p className="text-xs text-gray-400 mt-1">
            {new Date(createdAt).toLocaleString()}
          </p>
        </div>
      </div>
    </button>
  );
  }
  
