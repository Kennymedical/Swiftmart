import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { toolDeclarations, executeTool } from './tools';
import { callLLMWithFailover } from './llm-router';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).maybeSingle();
    if (!profile || !['admin', 'staff'].includes(profile.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => null);
    const message = body?.message;
    if (typeof message !== 'string' || !message.trim()) return NextResponse.json({ error: 'Message required' }, { status: 400 });

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!serviceRoleKey || !supabaseUrl) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

    const db = createSupabaseClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const adminName = profile.full_name || 'boss';

     const systemPrompt = `You are SwiftMart AI, the chief-of-staff for ${adminName}, owner of SwiftMart (Nigerian marketplace & fintech).
You can chat about anything, but your specialty is SwiftMart data.

## Rules for answering:
1. NEVER use markdown asterisks (**) for bold. Use CAPITAL LETTERS or emojis instead to emphasize.
2. Use bullet points with dashes (-) and double line breaks. Keep it clean and readable.
3. If asked about data, USE YOUR TOOLS FIRST. Do not guess.
4. If you search the database and find nothing, say "I checked the database but couldn't find X."
5. If a question is vague, ASK FOR CLARITY. E.g., "Do you mean sales for today or this week?"
6. Be warm, sharp, and proactive. Today is ${new Date().toISOString().split('T')[0]}.`;

    const messages: any[] = [{ role: 'system', content: systemPrompt }];
    if (Array.isArray(body.history)) {
      body.history.slice(-10).forEach((h: any) => messages.push({ role: h.role, content: h.content }));
    }
    messages.push({ role: 'user', content: message.trim() });

    for (let round = 0; round < 3; round++) {
      let llmResult;
      try {
        llmResult = await callLLMWithFailover(messages, toolDeclarations.map((t) => ({ type: 'function', function: t })));
      } catch (err: any) {
        return NextResponse.json({ error: 'All AI providers busy. Try again.' }, { status: 503 });
      }

      const msg = llmResult.data?.choices?.[0]?.message;
      if (!msg) return NextResponse.json({ error: 'Empty response' }, { status: 502 });

      if (msg.tool_calls && msg.tool_calls.length > 0) {
        messages.push(msg);
        for (const tc of msg.tool_calls) {
          const args = JSON.parse(tc.function.arguments || '{}');
          const result = await executeTool(tc.function.name, args, db, user.id);
          messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(result) });
        }
        continue;
      }

      if (msg.content) return NextResponse.json({ reply: msg.content, provider: llmResult.provider });
      messages.push({ role: 'assistant', content: '' });
    }

    return NextResponse.json({ error: 'AI needed too many steps.' }, { status: 502 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed: ' + error.message }, { status: 500 });
  }
}
