'use client';
import { useState, useRef, useEffect } from 'react';

export default function AdminAI() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function send() {
    if (!input.trim() || busy) return;
    const text = input;
    setInput('');
    setMessages(m => [...m, { role: 'user', content: text }]);
    setBusy(true);
    try {
      const res = await fetch('/api/admin/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      setMessages(m => [...m, { role: 'assistant', content: data.reply || data.error }]);
    } catch (e) {
      setMessages(m => [...m, { role: 'assistant', content: 'Error: ' + e.message }]);
    }
    setBusy(false);
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 16, fontFamily: 'system-ui' }}>
      <h1>SwiftMart AI — Admin</h1>
      <div style={{ border: '1px solid #334', borderRadius: 12, padding: 16, minHeight: 400, maxHeight: 500, overflowY: 'auto', background: '#0d1220', color: '#e6edf3' }}>
        {messages.length === 0 && (
          <div style={{ color: '#888' }}>
            Try: "What is our treasury balance?" or "Any open disputes?"
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ margin: '8px 0', textAlign: m.role === 'user' ? 'right' : 'left' }}>
            <span style={{
              display: 'inline-block',
              padding: '8px 14px',
              borderRadius: 16,
              background: m.role === 'user' ? '#1e88e5' : '#232c40',
              color: m.role === 'user' ? '#fff' : '#e6edf3',
              maxWidth: '80%',
              whiteSpace: 'pre-wrap',
            }}>{m.content}</span>
          </div>
        ))}
        {busy && <div style={{ color: '#888' }}>SwiftMart AI is thinking...</div>}
        <div ref={endRef} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Ask about sales, vendors, disputes..."
          style={{ flex: 1, padding: 12, borderRadius: 8, border: '1px solid #334', background: '#161d2d', color: '#e6edf3', fontSize: 15 }}
        />
        <button onClick={send} disabled={busy} style={{ padding: '12px 20px', borderRadius: 8, background: '#1e88e5', color: '#fff', border: 'none', fontSize: 15, cursor: 'pointer' }}>
          Send
        </button>
      </div>
    </div>
  );
                }
    
