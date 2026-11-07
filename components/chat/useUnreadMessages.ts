'use client';

// Total unread chat messages for the signed-in user (0 when signed out).
// Refreshes when you navigate and when any of your chats gets a new message.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';

export function useUnreadMessages(): number {
  const supabase = useMemo(() => createClient(), []);
  const pathname = usePathname();
  const [count, setCount] = useState(0);
  const [uid, setUid] = useState<string | null>(null);
  const timer = useRef<any>(null);

  const refresh = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) { setUid(null); setCount(0); return; }
    setUid(auth.user.id);
    const { data } = await supabase.rpc('chat_unread_counts');
    setCount(((data ?? []) as any[]).reduce((n, r) => n + Number(r.unread), 0));
  }, [supabase]);

  useEffect(() => { refresh(); }, [refresh, pathname]);

  useEffect(() => {
    if (!uid) return;
    const channel = supabase
      .channel(`unread-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_conversations' }, () => {
        clearTimeout(timer.current);
        timer.current = setTimeout(refresh, 500);
      })
      .subscribe();
    return () => { clearTimeout(timer.current); supabase.removeChannel(channel); };
  }, [supabase, uid, refresh]);

  return count;
}
