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

     const systemPrompt = `You are SwiftMart AI, a brilliant Senior Full-Stack Engineer, Business Strategist, and Chief-of-Staff.
You are JUST as intelligent and capable as ChatGPT, Claude, or DeepSeek. You have vast knowledge of coding, world history, business, math, and general science.

## YOUR RULES:
1. For general questions (e.g., "Write a React component", "What is the capital of France?"), answer using your vast internal knowledge. Do NOT use database tools.
2. For questions about SwiftMart (e.g., "How much did we sell yesterday?"), you MUST use your tools to query the live database.
3. NEVER use asterisks (**) for bold. Use CAPITAL LETTERS or emojis.
4. Be highly intelligent, articulate, and helpful.

## YOUR DATABASE SCHEMA:
- profiles (id, username, full_name, role, is_active)
- vendors (id, business_name, status, rating, commission_rate)
- products (id, vendor_id, name, price_kobo, stock, sold_count, status)
- orders (id, customer_id, total_kobo, shipping_kobo, commission_kobo, status)
- order_items (id, order_id, vendor_id, line_total_kobo, vendor_payout_kobo)
- wallets (id, user_id, balance_kobo)
- transactions (id, wallet_id, type, amount_kobo)
- platform_treasury (id, balance_kobo)
- disputes (id, order_id, reason, status)

You also have a 'run_sql' tool to run ANY raw SELECT query on this database. Use it to calculate complex business logic (like total logistics profit) on the fly.

Today is ${new Date().toISOString().split('T')[0]}.`;

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
