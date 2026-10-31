// Shared helpers for the chat API routes.
// Uses your existing lib/supabase/server.ts to identify the signed-in user,
// and the service-role key (server only) to write chat data.
import { NextResponse } from 'next/server';
import { createClient as createServiceClient, SupabaseClient } from '@supabase/supabase-js';
import { createClient as createUserClient } from '../supabase/server';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID.test(v);

export const fail = (status: number, error: string) =>
  NextResponse.json({ error }, { status });

/** Trimmed text between 1 and max characters, or null. */
export function cleanText(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length >= 1 && t.length <= max ? t : null;
}

export function adminDb(): SupabaseClient {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

/** The signed-in user, verified with Supabase (not just read from a cookie). */
export async function getUser() {
  const supabase = createUserClient();
  const { data } = await supabase.auth.getUser();
  return data?.user ?? null;
}

export async function isAdmin(db: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await db.from('profiles').select('role').eq('id', userId).maybeSingle();
  return data?.role === 'admin';
}

/** True if either user has blocked the other. */
export async function isBlocked(db: SupabaseClient, a: string, b: string): Promise<boolean> {
  const { data } = await db
    .from('chat_user_blocks')
    .select('blocker_id')
    .or(`and(blocker_id.eq.${a},blocked_id.eq.${b}),and(blocker_id.eq.${b},blocked_id.eq.${a})`)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

export type Vendor = { id: string; user_id: string; business_name: string; status: string };

/** Only approved vendors can receive chats. Others look like they do not exist. */
export async function getApprovedVendor(db: SupabaseClient, vendorId: string): Promise<Vendor | null> {
  const { data } = await db
    .from('vendors')
    .select('id, user_id, business_name, status')
    .eq('id', vendorId)
    .maybeSingle();
  if (!data || data.status !== 'approved') return null;
  return data as Vendor;
}

export async function postMessage(
  db: SupabaseClient,
  conversationId: string,
  senderId: string | null,
  type: string,
  body: string | null,
  metadata: Record<string, unknown> = {},
  storyId: string | null = null
) {
  const { error } = await db.from('chat_messages').insert({
    conversation_id: conversationId,
    sender_id: senderId,
    type,
    body,
    metadata,
    story_id: storyId,
  });
  if (error) throw error;
}

/** One ongoing thread per customer + vendor pair. */
export async function getOrCreateVendorThread(
  db: SupabaseClient,
  customerId: string,
  vendor: Vendor
): Promise<{ id: string; created: boolean }> {
  const find = () =>
    db
      .from('chat_conversations')
      .select('id')
      .eq('type', 'vendor')
      .eq('customer_id', customerId)
      .eq('vendor_id', vendor.id)
      .maybeSingle();

  let id: string | null = (await find()).data?.id ?? null;
  let created = false;

  if (!id) {
    const { data, error } = await db
      .from('chat_conversations')
      .insert({ type: 'vendor', customer_id: customerId, vendor_id: vendor.id, created_by: customerId })
      .select('id')
      .single();

    if (error) {
      // Two requests raced: the unique index stopped the second one. Use the first.
      if (error.code === '23505') id = (await find()).data?.id ?? null;
      if (!id) throw error;
    } else {
      id = data.id;
      created = true;
    }
  }

  // Make sure both sides are members (also repairs a changed vendor owner).
  const { error: pErr } = await db.from('chat_conversation_participants').upsert(
    [
      { conversation_id: id, user_id: customerId, role: 'member', left_at: null },
      { conversation_id: id, user_id: vendor.user_id, role: 'vendor_owner', left_at: null },
    ],
    { onConflict: 'conversation_id,user_id' }
  );
  if (pErr) throw pErr;

  return { id: id as string, created };
}
