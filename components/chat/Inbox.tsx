'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';
import { CONV_COLUMNS, ConvRow, Title, resolveTitles } from './names';

const TABS = [
  { key: 'orders', label: 'Orders', types: ['vendor'] },
  { key: 'support', label: 'Support', types: ['support', 'complaint'] },
  { key: 'friends', label: 'Friends', types: ['social', 'group'] },
];

const TOPICS = [
  { key: 'wallet', label: 'Wallet' },
  { key: 'account', label: 'Account' },
  { key: 'order', label: 'Order' },
  { key: 'other', label: 'Other' },
];

function when(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const today = new Date();
  return d.toDateString() === today.toDateString()
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

function HelpForm({ onDone }: { onDone: (id: string) => void }) {
  const [topic, setTopic] = useState('wallet');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim() || busy) return;
    setBusy(true);
    setError('');
    const res = await fetch('/api/chat/support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, message }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(j.error ?? 'Could not contact support'); return; }
    onDone(j.conversationId);
  }

  return (
    <form onSubmit={submit} className="m-4 p-4 rounded-xl border bg-white space-y-3">
      <p className="text-sm font-semibold">What do you need help with?</p>
      <div className="flex flex-wrap gap-2">
        {TOPICS.map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTopic(t.key)}
            className={`px-3 py-1.5 rounded-full text-xs border ${topic === t.key ? 'bg-[#1e88e5] text-white border-[#1e88e5]' : 'text-gray-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <textarea
        value={message}
        onChange={e => setMessage(e.target.value)}
        maxLength={2000}
        rows={4}
        placeholder="Describe the problem. Never share your PIN, password or OTP."
        className="w-full border rounded-lg p-2 text-sm focus:outline-none focus:border-[#1e88e5]"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={busy || !message.trim()}
        className="w-full py-2 rounded-full bg-[#1e88e5] text-white text-sm font-semibold disabled:opacity-50"
      >
        {busy ? 'Sending...' : 'Contact support'}
      </button>
    </form>
  );
}

export default function Inbox() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [state, setState] = useState<'loading' | 'ready' | 'signedout'>('loading');
  const [convs, setConvs] = useState<ConvRow[]>([]);
  const [titles, setTitles] = useState<Record<string, Title>>({});
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [tab, setTab] = useState('orders');
  const [showHelp, setShowHelp] = useState(false);
  const [me, setMe] = useState<string | null>(null);
  const timer = useRef<any>(null);

  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) { setState('signedout'); return; }
    setMe(uid);

    const [{ data: rows }, { data: counts }] = await Promise.all([
      supabase.from('chat_conversations').select(CONV_COLUMNS)
        .order('last_message_at', { ascending: false, nullsFirst: false }).limit(100),
      supabase.rpc('chat_unread_counts'),
    ]);

    const list = (rows ?? []) as ConvRow[];
    setConvs(list);
    setTitles(await resolveTitles(supabase, list, uid));

    const map: Record<string, number> = {};
    for (const r of (counts ?? []) as any[]) map[r.conversation_id] = Number(r.unread);
    setUnread(map);
    setState('ready');
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  // Refresh when any of my chats gets a new message (conversation row is updated by the database).
  useEffect(() => {
    if (!me) return;
    const channel = supabase
      .channel('inbox')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_conversations' }, () => {
        clearTimeout(timer.current);
        timer.current = setTimeout(load, 400);
      })
      .subscribe();
    return () => { clearTimeout(timer.current); supabase.removeChannel(channel); };
  }, [supabase, me, load]);

  const current = TABS.find(t => t.key === tab) ?? TABS[0];
  const visible = convs.filter(c => current.types.includes(c.type));
  const tabUnread = (types: string[]) =>
    convs.filter(c => types.includes(c.type)).reduce((n, c) => n + (unread[c.id] ?? 0), 0);

  if (state === 'signedout') {
    return <p className="p-8 text-center text-sm text-gray-600">Please sign in to view your messages.</p>;
  }

  return (
    <div className="max-w-2xl mx-auto min-h-screen bg-white">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <h1 className="text-xl font-bold">Messages</h1>
        <button onClick={() => setShowHelp(v => !v)} className="text-sm font-semibold text-[#1e88e5]">
          {showHelp ? 'Close' : 'Get help'}
        </button>
      </div>

      {showHelp && <HelpForm onDone={id => router.push(`/messages/${id}`)} />}

      <div className="flex border-b">
        {TABS.map(t => {
          const n = tabUnread(t.types);
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-3 text-sm font-semibold border-b-2 ${tab === t.key ? 'border-[#1e88e5] text-[#1e88e5]' : 'border-transparent text-gray-500'}`}
            >
              {t.label}
              {n > 0 && <span className="ml-1.5 inline-block min-w-[18px] px-1 rounded-full bg-red-500 text-white text-[11px]">{n}</span>}
            </button>
          );
        })}
      </div>

      {state === 'loading' && <p className="p-8 text-center text-sm text-gray-500">Loading...</p>}

      {state === 'ready' && visible.length === 0 && (
        <p className="p-8 text-center text-sm text-gray-400">
          {tab === 'orders' && 'No conversations with stores yet. Tap "Message store" on a product to start one.'}
          {tab === 'support' && 'No support chats. Tap "Get help" if you need us.'}
          {tab === 'friends' && 'No friend chats yet.'}
        </p>
      )}

      <ul>
        {visible.map(c => {
          const t = titles[c.id];
          const n = unread[c.id] ?? 0;
          return (
            <li key={c.id}>
              <Link href={`/messages/${c.id}`} className="flex items-center gap-3 px-4 py-3 border-b hover:bg-gray-50">
                <div className="w-11 h-11 rounded-full bg-[#1e88e5]/10 text-[#1e88e5] font-bold flex items-center justify-center overflow-hidden shrink-0">
                  {t?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (t?.title ?? '?').charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2">
                    <p className={`text-sm truncate ${n ? 'font-bold' : 'font-semibold'}`}>
                      {t?.title ?? 'Chat'}
                      {t?.sub && <span className="font-normal text-gray-400"> · {t.sub}</span>}
                    </p>
                    <span className="text-[11px] text-gray-400 shrink-0">{when(c.last_message_at ?? c.created_at)}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <p className={`text-xs truncate ${n ? 'text-gray-800' : 'text-gray-500'}`}>
                      {c.last_message_preview ?? 'No messages yet'}
                    </p>
                    {n > 0 && <span className="min-w-[18px] px-1 text-center rounded-full bg-red-500 text-white text-[11px] shrink-0">{n}</span>}
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
