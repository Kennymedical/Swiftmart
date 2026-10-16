import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { toolDeclarations, executeTool } from './tools';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles').select('role, full_name').eq('id', user.id).maybeSingle();
    if (!profile || !['admin', 'staff'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const message = body?.message;
    const history = body?.history;
    if (typeof message !== 'string' || !message.trim() || message.length > 4000) {
      return NextResponse.json({ error: 'Message 1-4000 chars required.' }, { status: 400 });
    }

    const safeHistory = Array.isArray(history)
      ? history.filter((e: unknown): e is { role: string; content: string } => {
          if (!e || typeof e !== 'object') return false;
          const x = e as { role?: unknown; content?: unknown };
          return (x.role === 'user' || x.role === 'assistant') && typeof x.content === 'string';
        }).slice(-14).map((x: { role: string; content: string }) => ({
          role: x.role as 'user' | 'assistant',
          content: x.content.slice(0, 4000),
        }))
      : [];

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });
    }

    const db = createSupabaseClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const groqKey = process.env.GROQ_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!groqKey && !openaiKey) return NextResponse.json({ error: 'No LLM configured.' }, { status: 500 });

    const endpoint = groqKey ? 'https://api.groq.com/openai/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions';
    const apiKey = groqKey || openaiKey;
    const model = groqKey ? 'openai/gpt-oss-20b' : 'gpt-4o-mini';

    const adminName = profile.full_name || 'boss';
    const systemPrompt = `You are SwiftMart AI — the trusted operational chief-of-staff for ${adminName}, owner of SwiftMart, a Nigerian multi-vendor marketplace and fintech platform.

## Who you are
You are a real, warm, sharp AI assistant — NOT a scripted bot. You have your own personality and can chat about anything: business advice, ideas, general knowledge, life, tech, whatever the user brings up. But your specialty is SwiftMart.

## How you speak
- Natural, friendly, and confident. Like a brilliant Nigerian operations manager who genuinely cares.
- Light Nigerian English warmth (e.g. "No wahala", "Oga", "Well done") — sparingly, not forced.
- Concise but conversational. Skip robotic preambles like "Certainly! Here is...". Just talk.
- Have opinions. If data suggests a problem, say so. If you spot an opportunity, mention it.
- Use emojis occasionally for warmth (📊 ✅ ⚠️ 💡) but don't overdo it.

## Your capabilities
You have REAL tools that query LIVE SwiftMart data. Use them freely.
- READ access to every table in the platform.
- WRITE access to: approve_vendor, suspend_vendor, resolve_dispute, send_admin_broadcast.
- For write actions: ALWAYS confirm with the user first. Never fire one without an explicit "yes".

## Money
Amounts in the DB are in kobo (1 naira = 100 kobo). Always show as ₦ with commas: ₦12,345.67.

## Today
${new Date().toISOString().split('T')[0]} (${new Date().toLocaleDateString('en-NG', { weekday: 'long' })})

## Behaviour
- When asked "how are we doing" / "brief me" / "anything new" — call get_platform_overview AND find_anomalies, then give a smart briefing with your own commentary.
- When asked about a specific thing — find it via list_* tools, then dig into details.
- Proactively mention things you notice: "By the way, 3 orders have been stuck for over a week — want me to look?"
- End responses with a helpful offer when relevant: "Want me to dig into X?"
- If the user asks something NON-SwiftMart related (general chat, advice, opinion) — just answer naturally like any good AI would. You're not limited to business topics.
- NEVER say "I don't have that information" without first trying a tool. Only say it after you've genuinely checked and the data isn't there.
`;

    const messages: any[] = [{ role: 'system', content: systemPrompt }];
    for (const h of safeHistory) messages.push(h);
    messages.push({ role: 'user', content: message.trim() });

    for (let round = 0; round < 3; round++) {
      const aiResp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages,
          tools: toolDeclarations.map((t) => ({ type: 'function', function: t })),
          tool_choice: 'auto',
          temperature: 0.5,
          max_tokens: 1200,
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (!aiResp.ok) {
        const errText = await aiResp.text();
        console.error('AI provider error:', errText.slice(0, 500));
        return NextResponse.json({ error: 'AI error: ' + errText.slice(0, 250) }, { status: 502 });
      }

      const data = await aiResp.json();
      const msg = data.choices?.[0]?.message;
      if (!msg) return NextResponse.json({ error: 'Empty AI response.' }, { status: 502 });

      if (msg.tool_calls && msg.tool_calls.length > 0) {
        messages.push(msg);
        for (const tc of msg.tool_calls) {
          const args = JSON.parse(tc.function.arguments || '{}');
          const result = await executeTool(tc.function.name, args, db, user.id);
          messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(result) });
        }
        continue;
      }

      const reply = msg.content;
      if (typeof reply !== 'string' || !reply.trim()) {
        return NextResponse.json({ error: 'Empty AI response.' }, { status: 502 });
      }
      return NextResponse.json({ reply });
    }

    return NextResponse.json({ error: 'AI needed too many steps.' }, { status: 502 });
  } catch (error) {
    console.error('SwiftMart AI route error:', error);
    return NextResponse.json({ error: 'Request failed.' }, { status: 500 });
  }
}
