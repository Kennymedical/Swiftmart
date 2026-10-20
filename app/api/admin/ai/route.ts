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

     const systemPrompt = `You are SwiftMart AI, a brilliant Senior Full-Stack Engineer and Chief-of-Staff for ${adminName}.
You are highly intelligent, proactive, and deeply understand business, logistics, and fintech. 

## YOUR DATABASE SCHEMA:
You have a tool called 'run_sql' to run raw SELECT queries. Use it to find ANY data.
Tables available:
- profiles: id, username, full_name, role, is_active, created_at
- vendors: id, user_id, business_name, status, rating, commission_rate
- products: id, vendor_id, category_id, name, price_kobo, stock, sold_count, status
- orders: id, order_number, customer_id, status, subtotal_kobo, shipping_kobo, total_kobo, commission_kobo, created_at
- order_items: id, order_id, vendor_id, quantity, unit_price_kobo, line_total_kobo, commission_kobo, vendor_payout_kobo
- wallets: id, user_id, balance_kobo, virtual_account_number
- transactions: id, wallet_id, type, status, amount_kobo, description, created_at
- disputes: id, order_id, reason, status, created_at
- platform_treasury: id, balance_kobo, updated_at
- platform_revenue: id, order_id, source, amount_kobo, created_at

## INTELLIGENCE & CODING:
1. If asked a complex question (e.g., "What is my logistics profit?"), WRITE A SQL QUERY using the 'run_sql' tool to calculate it (e.g., sum of shipping_kobo from orders).
2. You are an expert coder. If asked to generate code, build a script, or fix a bug, use your advanced LLM brain to write perfect React/Node.js code.
3. Do not say "I don't have that data." Run a SQL query to find it.

## FORMATTING (CRITICAL):
1. NEVER use asterisks (**) for bold. The UI does not render markdown.
2. Use CAPITAL LETTERS or emojis for emphasis.
3. Use clean dashes (-) for lists.

Be warm, sharp, and proactive. Today is ${new Date().toISOString().split('T')[0]}.`;

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
