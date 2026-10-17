'use client';
import { useState, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

type Message = { role: 'user' | 'assistant'; content: string };

export default function SwiftMartAIFloating() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [unreadReports, setUnreadReports] = useState(0);
  const endRef = useRef<HTMLDivElement | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (open && endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  // Check for unread reports every 60 seconds
  useEffect(() => {
    const checkReports = async () => {
      const { data } = await supabase
        .from('admin_reports')
        .select('id')
        .eq('is_read', false);
      
      if (data) setUnreadReports(data.length);
    };

    checkReports();
    const interval = setInterval(checkReports, 60000);
    return () => clearInterval(interval);
  }, [supabase]);

  async function handleOpen() {
    setOpen(true);
    // Mark reports as read when opening chat
    if (unreadReports > 0) {
      await supabase.from('admin_reports').update({ is_read: true }).eq('is_read', false);
      setUnreadReports(0);
    }
  }

  async function send() {
    if (!input.trim() || busy) return;
    const text = input;
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: text }]);
    setBusy(true);

    try {
      const res = await fetch('/api/admin/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: data.reply || data.error || 'No reply' },
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setMessages((m) => [...m, { role: 'assistant', content: 'Error: ' + msg }]);
    }
    setBusy(false);
  }

  return (
    <>
      {!open && (
        <button
          onClick={handleOpen}
          className="fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex items-center justify-center text-2xl transition-transform hover:scale-105 relative"
          aria-label="Open SwiftMart AI"
        >
          💬
          {unreadReports > 0 && (
            <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 border-2 border-white rounded-full animate-pulse"></span>
          )}
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-[9999] w-[360px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-2rem)] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm">🛒</div>
              <div>
                <div className="font-semibold text-sm leading-tight">SwiftMart AI</div>
                <div className="text-[11px] opacity-80">Admin Assistant</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white text-xl leading-none px-1">✕</button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.length === 0 && (
              <div className="text-center text-gray-400 text-sm mt-4">
                <div className="text-3xl mb-2">👋</div>
                <div className="font-medium text-gray-600 mb-4">Hi, I&apos;m SwiftMart AI</div>
                <div className="space-y-2">
                  {['How are we doing today?', 'Any worrying anomalies?', 'Give me a brief'].map((q) => (
                    <button key={q} onClick={() => setInput(q)} className="block w-full text-left px-3 py-2 rounded-xl bg-white border border-gray-200 hover:border-blue-400 hover:text-blue-600 text-gray-600 text-xs transition">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${m.role === 'user' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm'}`}>
                  {m.content}
                </div>
              </div>
            ))}
            
            {busy && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-3.5 py-3 flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0.15s' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0.3s' }} />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="p-3 bg-white border-t border-gray-100 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Ask SwiftMart AI..."
              className="flex-1 px-4 py-2.5 rounded-full border border-gray-200 text-sm focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={send}
              disabled={busy || !input.trim()}
              className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white flex items-center justify-center shrink-0 transition"
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}
