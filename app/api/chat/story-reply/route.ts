// POST /api/chat/story-reply
// Body: { storyId, message }
// Sends a reply to a vendor story into the customer <-> vendor thread, with the story attached.
import { NextResponse } from 'next/server';
import {
  adminDb, getUser, fail, isUuid, cleanText, isBlocked, getApprovedVendor,
  getOrCreateVendorThread, postMessage,
} from '../../../../lib/chat/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return fail(401, 'Not signed in');

  const body = await req.json().catch(() => ({} as any));
  const { storyId } = body;
  const message = cleanText(body.message, 1000);
  if (!isUuid(storyId)) return fail(400, 'storyId is required');
  if (!message) return fail(400, 'Write a reply (up to 1000 characters)');

  const db = adminDb();

  try {
    // Only live stories can be replied to.
    const { data: story } = await db
      .from('stories')
      .select('id, vendor_id, media_url, media_type, caption, product_id, expires_at')
      .eq('id', storyId).gt('expires_at', new Date().toISOString()).maybeSingle();
    if (!story) return fail(404, 'This story is no longer available');

    const vendor = await getApprovedVendor(db, story.vendor_id);
    if (!vendor) return fail(404, 'This story is no longer available');
    if (vendor.user_id === user.id) return fail(400, 'You cannot reply to your own story');
    if (await isBlocked(db, user.id, vendor.user_id)) return fail(403, 'You cannot reply to this story');

    const thread = await getOrCreateVendorThread(db, user.id, vendor);

    // Snapshot, so the card still renders after the story is gone.
    // (The image file itself is deleted when the story is purged; the app
    // shows "Story no longer available" if the image fails to load.)
    await postMessage(db, thread.id, user.id, 'story_reply', message, {
      vendor_name: vendor.business_name,
      media_url: story.media_url,
      media_type: story.media_type,
      caption: story.caption,
      product_id: story.product_id,
      expires_at: story.expires_at,
    }, story.id);

    return NextResponse.json({ conversationId: thread.id });
  } catch (e: any) {
    return fail(500, e?.message ?? 'Could not send reply');
  }
}
