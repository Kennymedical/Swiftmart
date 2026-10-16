import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getAISupabaseClient } from '@/lib/supabase/ai-client';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized: Sign in required' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError || !profile || !['admin', 'staff'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const message = body?.message;
    const history = body?.history;
    if (typeof message !== 'string' || !message.trim() || message.length > 4000) {
      return NextResponse.json({ error: 'A message between 1 and 4000 characters is required.' }, { status: 400 });
    }

    const safeHistory = Array.isArray(history)
      ? history
          .filter((entry: unknown): entry is { role: string; content: string } => {
            if (!entry || typeof entry !== 'object') return false;
            const item = entry as { role?: unknown; content?: unknown };
            return (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string';
          })
          .slice(-12)
          .map((item: { role: string; content: string }) => ({
            role: item.role as 'user' | 'assistant',
            content: item.content.slice(0, 4000),
          }))
      : [];

    let db = supabase;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (serviceRoleKey && supabaseUrl) {
      db = createSupabaseClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      }) as typeof supabase;
    }

    const [ordersRes, vendorsRes, alertsRes, commissionRes] = await Promise.all([
      db.from('orders').select('id, total_kobo, status, created_at').order('created_at', { ascending: false }).limit(50),
      db.from('vendors').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      db.from('security_alerts').select('id', { count: 'exact', head: true }).eq('resolved', false),
      db.from('platform_settings').select('value').eq('key', 'global_commission_rate').maybeSingle(),
    ]);

    const queryError = ordersRes.error || vendorsRes.error || alertsRes.error || commissionRes.error;
    if (queryError) {
      console.error('SwiftMart AI data query failed:', queryError.message);
      return NextResponse.json(
        { error: 'I could not read the live store data. Check the Supabase service-role configuration and admin RLS policies.' },
        { status: 503 },
      );
    }

    const recentOrders = ordersRes.data || [];
    const salesKobo = recentOrders
      .filter((order) => !['cancelled', 'pending_payment'].includes(order.status))
      .reduce((sum, order) => sum + (Number(order.total_kobo) || 0), 0);
    const commissionValue = commissionRes.data?.value as { rate_percent?: number } | null;
    const commissionPercent = Number(commissionValue?.rate_percent ?? 10);

    const aiSupabase = getAISupabaseClient();
    let extraAIContext = '';
    if (aiSupabase) {
      const { data, error } = await aiSupabase.from('ai_knowledge').select('title, content').limit(5);
      if (!error && data?.length) {
        extraAIContext = `\n\nAI knowledge base (reference material):\n${data
          .map((item) => `• ${item.title}: ${item.content}`)
          .join('\n')}`;
      }
    }

    const systemPrompt = `You are SwiftMart AI, an operational assistant for admins and staff of a Nigerian marketplace and fintech platform. Use the live data below when answering. State clearly when the data does not answer a question; do not invent figures. Currency is Nigerian naira (₦).\n\nLive data snapshot (recent 50 orders only):\n- Non-cancelled, non-pending-payment order volume in sample: ₦${Math.round(salesKobo / 100).toLocaleString('en-NG')}\n- Orders sampled: ${recentOrders.length}\n- Pending vendor approvals: ${vendorsRes.count ?? 0}\n- Open security alerts: ${alertsRes.count ?? 0}\n- Platform commission: ${commissionPercent}%${extraAIContext}`;

    const groqKey = process.env.GROQ_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!groqKey && !openaiKey) {
      const reply = `Live SwiftMart snapshot (latest ${recentOrders.length} orders):\n• Order volume in sample: ₦${Math.round(salesKobo / 100).toLocaleString('en-NG')}\n• Pending vendor approvals: ${vendorsRes.count ?? 0}\n• Open security alerts: ${alertsRes.count ?? 0}\n• Commission: ${commissionPercent}%\n\nAdd GROQ_API_KEY or OPENAI_API_KEY in Vercel to enable natural-language answers.`;
      return NextResponse.json({ reply });
    }

    const provider = groqKey ? 'groq' : 'openai';
    const endpoint = groqKey
      ? 'https://api.groq.com/openai/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions';
    const apiKey = groqKey || openaiKey;
    const model = groqKey ? 'llama-3.1-8b-instant' : 'gpt-4o-mini';
    const aiResponse = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...safeHistory,
          { role: 'user', content: message.trim() },
        ],
        temperature: 0.3,
        max_tokens: 1024,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!aiResponse.ok) {
      const providerError = await aiResponse.text();
      console.error(`SwiftMart AI ${provider} provider error:`, providerError.slice(0, 500));
      return NextResponse.json({ error: `The ${provider} AI service could not complete the request.` }, { status: 502 });
    }

    const result = await aiResponse.json();
    const reply = result.choices?.[0]?.message?.content;
    if (typeof reply !== 'string' || !reply.trim()) {
      return NextResponse.json({ error: 'The AI service returned an empty response.' }, { status: 502 });
    }

    if (aiSupabase) {
      const { error } = await aiSupabase.from('ai_chat_logs').insert({
        admin_id: user.id,
        admin_name: profile.full_name || 'Admin',
        user_message: message.trim(),
        ai_reply: reply,
      });
      if (error) console.error('SwiftMart AI log insert failed:', error.message);
    }

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('SwiftMart AI route error:', error);
    return NextResponse.json({ error: 'The AI request could not be completed.' }, { status: 500 });
  }
}
