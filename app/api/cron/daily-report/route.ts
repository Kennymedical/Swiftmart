import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { callLLMWithFailover } from '../../admin/ai/llm-router';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const [orders, vendors, disputes] = await Promise.all([
      db.from('orders').select('total_kobo, status').gte('created_at', new Date(Date.now() - 86400000).toISOString()),
      db.from('vendors').select('id, status'),
      db.from('disputes').select('id, status').neq('status', 'resolved'),
    ]);

    const sales = (orders.data || []).filter(o => !['cancelled','pending_payment'].includes(o.status)).reduce((s, o) => s + Number(o.total_kobo), 0) / 100;
    const pendingVendors = (vendors.data || []).filter(v => v.status === 'pending').length;

    const context = `Yesterday's Sales: ₦${sales.toLocaleString()}. Pending Vendors: ${pendingVendors}. Open Disputes: ${disputes.data?.length || 0}.`;

    const prompt = `Write a short, motivating morning briefing for the SwiftMart owner. Use plain text only (no ** markdown). Data: ${context}. Give one actionable suggestion.`;
    
    const result = await callLLMWithFailover([{ role: 'user', content: prompt }], []);
    const reportText = result.data.choices[0].message.content;

    await db.from('admin_reports').insert({
      title: 'Your Daily Morning Brief',
      content: reportText || 'No report generated today.',
    });

    return NextResponse.json({ ok: true, report: reportText });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
