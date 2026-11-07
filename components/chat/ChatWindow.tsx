'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';
import { CONV_COLUMNS, ConvRow, Title, resolveTitles } from './names';

type Msg = {
  id: string;
  sender_id: string | null;
  type: string;
  body: string | null;
  metadata: any;
  created_at: string;
};

const naira = (kobo: number) => `₦${(Number(kobo) / 100).toLocaleString()}`;
const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

// Gentle reminder, never blocks sending.
const OFF_PLATFORM = /(\b0\d{10}\b|\+?234\d{10}|account\s*number|pay\s*me\s*directly|send\s*money\s*to|bank\s*transfer)/i;

function StoryThumb({ meta }: { meta: any }) {
  const [broken, setBroken] = useState(false);

  if (broken || !meta?.media_url) {
    return <div className="mb-2 rounded-lg bg-black/10 text-xs px-3 py-4 text-center">Story no longer available</div>;
  }
  if (meta.media_type === 'video') {
    return <div className="mb-2 rounded-lg bg-black/10 text-xs px-3 py-4 text-center">Video story</div>;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={meta.media_url}
      alt="Story"
      onError={() => setBroken(true)}
      className="mb-2 rounded-lg max-h-48 w-full object-cover"
    />
  );
}

function Bubble({ m, mine }: { m: Msg; mine: boolean }) {
  const meta = m.metadata ?? {};

  if (m.type === 'system') {
    return <p className="text-center text-xs text-gray-500 px-6 py-1">{m.body}</p>;
  }

  const tone = mine
    ? 'bg-[#1e88e5] text-white rounded-br-sm'
    : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm';

  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[82%] p-2.5 rounded-xl text-sm ${tone}`}>
        {m.type === 'product_card' && (
          <div className="flex gap-2 items-center">
            {meta.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={meta.image} alt="" className="w-12 h-12 rounded-lg object-cover" />
            )}
            <div>
              <p className="font-semibold">{meta.name}</p>
              {meta.price_kobo != null && <p className="text-xs opacity-80">{naira(meta.price_kobo)}</p>}
            </div>
          </div>
        )}

        {m.type === 'order_card' && (
          <div>
            <p className="font-semibold">Order {meta.order_number}</p>
            <p className="text-xs opacity-80 capitalize">{String(meta.status ?? '').replace(/_/g, ' ')}</p>
            {Array.isArray(meta.items) &&
              meta.items.map((it: any, i: number) => (
                <p key={i} className="text-xs mt-1">
                  {it.quantity ? `${it.quantity} × ` : ''}{it.product_name}
                </p>
              ))}
          </div>
        )}

        {m.type === 'story_reply' && (
          <div>
            <StoryThumb meta={meta} />
            {meta.caption && <p className="text-xs opacity-80 mb-1">{meta.caption}</p>}
            <p className="whitespace-pre-wrap break-words">{m.body}</p>
          </div>
        )}

        {m.type === 'text' && <p className="whitespace-pre-wrap break-words">{m.body}</p>}

        {!['text', 'product_card', 'order_card', 'story_reply'].includes(m.type) && (
          <p className="text-xs italic opacity-80">This message type is not supported yet.</p>
        )}

        <p className={`text-[10px] mt-1 text-right ${mine ? 'text-white/70' : 'text-gray-400'}`}>
          {clock(m.created_at)}
        </p>
      </div>
    </div>
  );
}

export default function ChatWindow({ conversationId }: { conversationId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'signedout'>('loading');
  const [me, setMe] = useState<string | null>(null);
  const [conv, setConv] = useState<ConvRow | null>(null);
  const [title, setTitle] = useState<Title | null>(null);
  const [isMember, setIsMember] = useState(true);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const markRead = useCallback(
    async (uid: string) => {
      await supabase
        .from('chat_conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', uid);
    },
    [supabase, conversationId]
  );

  // Load chat, membership and the latest 100 messages.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) { if (!cancelled) setState('signedout'); return; }

      const { data: c } = await supabase
        .from('chat_conversations').select(CONV_COLUMNS).eq('id', conversationId).maybeSingle();
      if (!c) { if (!cancelled) setState('missing'); return; }

      const [partRes, msgRes, titles] = await Promise.all([
        supabase.from('chat_conversation_participants').select('user_id')
          .eq('conversation_id', conversationId).eq('user_id', uid).is('left_at', null).maybeSingle(),
        supabase.from('chat_messages').select('*')
          .eq('conversation_id', conversationId).order('created_at', { ascending: false }).limit(100),
        resolveTitles(supabase, [c as ConvRow], uid),
      ]);
      if (cancelled) return;

      setMe(uid);
      setConv(c as ConvRow);
      setTitle(titles[(c as ConvRow).id] ?? null);
      setIsMember(!!partRes.data);
      setMessages(((msgRes.data ?? []) as Msg[]).slice().reverse());
      setState('ready');
      if (partRes.data) markRead(uid);
    })();
    return () => { cancelled = true; };
  }, [supabase, conversationId, markRead]);

  // Live messages. Supabase only sends rows this user is allowed to read.
  useEffect(() => {
    if (!me) return;
    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${conversationId}` },
        (payload: any) => {
          const row = payload.new as Msg;
          setMessages(prev => (prev.some(m => m.id === row.id) ? prev : [...prev, row]));
          if (row.sender_id !== me) markRead(me);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, conversationId, me, markRead]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || !me || sending) return;
    setSending(true);
    setError('');
    const { data, error: err } = await supabase
      .from('chat_messages')
      .insert({ conversation_id: conversationId, sender_id: me, type: 'text', body })
      .select()
      .single();
    setSending(false);
    if (err || !data) { setError('Message not sent. Please try again.'); return; }
    setText('');
    setMessages(prev => (prev.some(m => m.id === (data as Msg).id) ? prev : [...prev, data as Msg]));
  }

  async function join() {
    setError('');
    const res = await fetch('/api/chat/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? 'Could not join this chat');
      return;
    }
    setIsMember(true);
    if (me) markRead(me);
  }

  const showWarning = conv?.type === 'vendor' && OFF_PLATFORM.test(text);

  function goBack() {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back();
    else router.push('/messages');
  }

  if (state === 'loading') {
    return <div className="fixed inset-0 z-50 bg-white flex items-center justify-center text-sm text-gray-500">Loading chat...</div>;
  }
  if (state === 'signedout' || state === 'missing') {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center gap-3 text-sm text-gray-600">
        <p>{state === 'signedout' ? 'Please sign in to view your messages.' : 'This chat was not found.'}</p>
        <button onClick={() => router.push('/messages')} className="text-[#1e88e5] font-semibold">Back to messages</button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Header */}
      <div className="bg-[#1e88e5] text-white px-3 py-3 flex items-center gap-3">
        <button onClick={goBack} aria-label="Back" className="p-1 rounded hover:bg-blue-600">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-bold overflow-hidden">
          {title?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={title.image} alt="" className="w-full h-full object-cover" />
          ) : (
            (title?.title ?? '?').charAt(0).toUpperCase()
          )}
        </div>
        <div className="min-w-0">
          <p className="font-bold text-sm truncate">{title?.title ?? 'Chat'}</p>
          {title?.sub && <p className="text-xs text-white/80 truncate">{title.sub}</p>}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {messages.length === 0 && <p className="text-center text-xs text-gray-400 mt-4">No messages yet. Say hello.</p>}
        {messages.map(m => (
          <Bubble key={m.id} m={m} mine={m.sender_id === me} />
        ))}
        <div ref={endRef} />
      </div>

      {/* Footer */}
      {conv?.is_readonly ? (
        <p className="p-3 text-center text-xs text-gray-500 border-t bg-white">This chat is closed and can no longer receive messages.</p>
      ) : !isMember ? (
        <div className="p-3 border-t bg-white flex items-center justify-between gap-3">
          <p className="text-xs text-gray-500">You are viewing this chat. Join to reply.</p>
          <button onClick={join} className="px-4 py-2 rounded-full bg-[#1e88e5] text-white text-sm font-semibold">Join chat</button>
        </div>
      ) : (
        <form onSubmit={send} className="p-3 border-t bg-white">
          {showWarning && (
            <p className="mb-2 text-xs bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg px-3 py-2">
              For your safety, keep payments inside SwiftMart. Payments made outside the app are not protected.
            </p>
          )}
          {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              maxLength={2000}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 border rounded-full text-sm focus:outline-none focus:border-[#1e88e5]"
            />
            <button
              type="submit"
              disabled={sending || !text.trim()}
              aria-label="Send"
              className="w-10 h-10 bg-[#1e88e5] text-white rounded-full flex items-center justify-center disabled:opacity-50"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" /></svg>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
