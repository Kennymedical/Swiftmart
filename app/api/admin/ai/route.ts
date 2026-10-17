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
✅ Chunk 3 donecat
