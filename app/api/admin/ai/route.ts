import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // 1. Auth check
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized: Sign in required' }, { status: 401 });
    }

    // 2. Role check
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError || !profile || !['admin', 'staff'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // 3. Input validation
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

    // 4. Service-role client (bypasses RLS)
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceRoleKey || !supabaseUrl) {
      console.error('SwiftMart AI: Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL');
      return NextResponse.json(
        { error: 'Server misconfigured. Contact the platform owner.' },
        { status: 500 },
      );
    }

    const db = createSupabaseClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 5. Fetch only REAL tables
    const [ordersRes, vendorsRes, treasuryRes, disputesRes, productsRes] = await Promise.all([
      db.from('orders').select('id, total_kobo, status, created_at').order('created_at', { ascending: false }).limit(50),
      db.from('vendors').select('id, status, created_at').order('created_at', { ascending: false }).limit(100),
      db.from('platform_treasury').select('balance_kobo, updated_at').order('updated_at', { ascending: false }).limit(1).maybeSingle(),
      db.from('disputes').select('id, status, category, created_at').order('created_at', { ascending: false }).limit(20),
      db.from('products').select('id, name, price_kobo, stock, sold_count').order('sold_count', { ascending: false, nullsFirst: false }).limit(10),
    ]);

    // 6. Build snapshot (tolerate any single table erroring)
    const recentOrders = ordersRes.data || [];
    const vendors = vendorsRes.data || [];
    const treasury = treasuryRes.data;
    const disputes = disputesRes.data || [];
    const topProducts = productsRes.data || [];

    const completedSalesKobo = recentOrders
      .filter((o) => !['cancelled', 'pending_payment'].includes(o.status))
      .reduce((sum, o) => sum + (Number(o.total_kobo) || 0), 0);

    const pendingVendors = vendors.filter((v) => v.status === 'pending').length;
    const openDisputes = disputes.filter((d) => !['resolved', 'closed'].includes(d.status)).length;

    const snapshot = [
      `Recent 50 orders: ₦${(completedSalesKobo / 100).toLocaleString('en-NG')} in non-cancelled sales`,
      `Total vendors: ${vendors.length} (${pendingVendors} pending approval)`,
      `Treasury balance: ₦${((Number(treasury?.balance_kobo) || 0) / 100).toLocaleString('en-NG')}`,
      `Open disputes: ${openDisputes} of ${disputes.length} total`,
      `Top products by sales: ${topProducts.map((p) => `${p.name} (${p.sold_count || 0} sold)`).join(', ') || 'none yet'}`,
    ].join('\n- ');

    const systemPrompt = `You are SwiftMart AI, an operational assistant for admins of a Nigerian marketplace and fintech platform. Use only the live data below. Never invent numbers. Currency is Nigerian naira (₦). If asked about something not in the data, say you don't have that information.

Live data snapshot:
- ${snapshot}`;

    // 7. LLM call
    const groqKey = process.env.GROQ_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!groqKey && !openaiKey) {
      return NextResponse.json({
        reply: `Live SwiftMart snapshot:\n\n- ${snapshot}\n\n(Add GROQ_API_KEY in Vercel to enable natural-language answers.)`,
      });
    }

    const endpoint = groqKey
      ? 'https://api.groq.com/openai/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions';
    const apiKey = groqKey || openaiKey;
    const model = groqKey ? 'openai/gpt-oss-120b' : 'gpt-4o-mini';

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
      const errText = await aiResponse.text();
      console.error('SwiftMart AI provider error:', errText.slice(0, 500));
      return NextResponse.json({ error: 'AI service unavailable. Try again.' }, { status: 502 });
    }

    const result = await aiResponse.json();
    const reply = result.choices?.[0]?.message?.content;
    if (typeof reply !== 'string' || !reply.trim()) {
      return NextResponse.json({ error: 'Empty AI response.' }, { status: 502 });
    }

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('SwiftMart AI route error:', error);
    return NextResponse.json({ error: 'Request failed.' }, { status: 500 });
  }
}	

