// POST /api/chat/support
// Body: { topic: 'wallet' | 'account' | 'order' | 'other', message }
// Opens a support chat (or adds to the open one for the same topic).
import { NextResponse } from 'next/server';
import { adminDb, getUser, fail, cleanText, postMessage } from '../../../../lib/chat/server';

export const dynamic = 'force-dynamic';

const TOPICS = ['wallet', 'account', 'order', 'other'];
const MAX_OPEN = 5;

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return fail(401, 'Not signed in');

  const body = await req.json().catch(() => ({} as any));
  const topic = String(body.topic ?? '');
  const message = cleanText(body.message, 2000);
  if (!TOPICS.includes(topic)) return fail(400, 'Choose a valid topic');
  if (!message) return fail(400, 'Please describe your problem (up to 2000 characters)');

  const db = adminDb();

  try {
    const { data: open } = await db
      .from('chat_conversations').select('id, support_topic')
      .eq('type', 'support').eq('created_by', user.id).neq('support_status', 'resolved');

    let conversationId: string | null = open?.find(c => c.support_topic === topic)?.id ?? null;
    let created = false;

    if (!conversationId) {
      if ((open?.length ?? 0) >= MAX_OPEN) return fail(429, 'You have too many open support chats');

      const { data, error } = await db
        .from('chat_conversations')
        .insert({ type: 'support', created_by: user.id, support_topic: topic, support_status: 'new' })
        .select('id').single();
      if (error) throw error;
      conversationId = data.id;
      created = true;

      const { error: pErr } = await db.from('chat_conversation_participants')
        .insert({ conversation_id: conversationId, user_id: user.id, role: 'member' });
      if (pErr) throw pErr;
    }

    await postMessage(db, conversationId as string, user.id, 'text', message);

    if (created) {
      await postMessage(
        db, conversationId as string, null, 'system',
        'Thanks for contacting SwiftMart support. An agent will reply here. We will never ask for your password, PIN or OTP.'
      );
    }

    return NextResponse.json({ conversationId, created });
  } catch (e: any) {
    return fail(500, e?.message ?? 'Could not open support chat');
  }
}
