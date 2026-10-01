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
      className={`w-full text-left p-4 border-b border-[#D4AF37]/15 hover:bg-[#151B3D]/60 transition last:border-0 ${
        !readAt ? 'bg-[#151B3D]/70' : 'bg-[#0A1028]'
      }`}
    >
      <div className="flex items-start gap-2.5">
        {!readAt && <span className="mt-1.5 h-2 w-2 rounded-full bg-[#D4AF37] flex-shrink-0 animate-pulse" />}
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${!readAt ? 'font-bold text-[#F5C445]' : 'font-medium text-white'}`}>
            {title}
          </p>
          <p className="text-sm text-slate-300 mt-0.5 leading-snug">{body}</p>
          <p className="text-[11px] text-[#D4AF37]/80 mt-1">
            {new Date(createdAt).toLocaleString()}
          </p>
        </div>
      </div>
    </button>
  );
}
