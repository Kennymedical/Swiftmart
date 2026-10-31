// POST /api/chat/join
// Body: { conversationId }
// Admin only. Adds the admin to a chat and tells everyone in it. Every join is logged.
// Support and dispute chats can be joined directly. Private vendor/social/group chats
// can only be joined when an open report exists for that chat.
import { NextResponse } from 'next/server';
import { adminDb, getUser, fail, isUuid, isAdmin, postMessage } from '../../../../lib/chat/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return fail(401, 'Not signed in');

  const body = await req.json().catch(() => ({} as any));
  const { conversationId } = body;
  if (!isUuid(conversationId)) return fail(400, 'conversationId is required');

  const db = adminDb();

  try {
    if (!(await isAdmin(db, user.id))) return fail(403, 'Admins only');

    const { data: conv } = await db
      .from('chat_conversations').select('id, type').eq('id', conversationId).maybeSingle();
    if (!conv) return fail(404, 'Chat not found');

    if (['vendor', 'social', 'group'].includes(conv.type)) {
      const { data: reports } = await db
        .from('chat_reports').select('id')
        .eq('conversation_id', conv.id).in('status', ['open', 'reviewing']).limit(1);
      if (!reports || reports.length === 0) {
        return fail(403, 'Private chats can only be joined when a report is open');
      }
    }

    const { data: existing } = await db
      .from('chat_conversation_participants').select('user_id, left_at')
      .eq('conversation_id', conv.id).eq('user_id', user.id).maybeSingle();
    const alreadyIn = !!existing && existing.left_at === null;

    const { error } = await db.from('chat_conversation_participants').upsert(
      { conversation_id: conv.id, user_id: user.id, role: 'admin', left_at: null },
      { onConflict: 'conversation_id,user_id' }
    );
    if (error) throw error;

    if (!alreadyIn) {
      await postMessage(db, conv.id, null, 'system', 'A SwiftMart admin has joined this chat.');
    }

    await db.from('chat_admin_audit_log').insert({
      admin_id: user.id,
      action: 'joined_chat',
      conversation_id: conv.id,
      details: { type: conv.type },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return fail(500, e?.message ?? 'Could not join chat');
  }
}
