// POST /api/chat/dispute
// Body: { disputeId }
// - The customer who raised the dispute gets a private thread with SwiftMart.
// - An admin calling this also gets the admin <-> vendor threads (one per vendor on the order)
//   and is added to each thread.
// Closing/reopening a dispute locks/unlocks these chats automatically (database trigger).
import { NextResponse } from 'next/server';
import { adminDb, getUser, fail, isUuid, isAdmin, postMessage } from '../../../../lib/chat/server';

export const dynamic = 'force-dynamic';

const CLOSED = ['resolved', 'closed', 'rejected', 'dismissed', 'refunded'];

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return fail(401, 'Not signed in');

  const body = await req.json().catch(() => ({} as any));
  const { disputeId } = body;
  if (!isUuid(disputeId)) return fail(400, 'disputeId is required');

  const db = adminDb();

  try {
    const { data: dispute } = await db
      .from('disputes').select('id, order_id, raised_by, status, resolved_at')
      .eq('id', disputeId).maybeSingle();
    const admin = await isAdmin(db, user.id);

    // Same answer for "missing" and "not yours", so ids cannot be probed.
    if (!dispute || (!admin && dispute.raised_by !== user.id)) return fail(404, 'Dispute not found');

    const closed =
      !!dispute.resolved_at || CLOSED.includes(String(dispute.status ?? '').toLowerCase());

    async function thread(
      party: 'customer' | 'vendor',
      vendor: { id: string; user_id: string } | null,
      memberId: string,
      memberRole: 'member' | 'vendor_owner',
      welcome: string
    ): Promise<string> {
      const find = () => {
        let q: any = db.from('chat_conversations').select('id')
          .eq('type', 'complaint').eq('complaint_id', dispute!.id).eq('complaint_party', party);
        q = vendor ? q.eq('vendor_id', vendor.id) : q.is('vendor_id', null);
        return q.maybeSingle();
      };

      let id: string | null = (await find()).data?.id ?? null;
      let created = false;

      if (!id) {
        const { data, error } = await db.from('chat_conversations').insert({
          type: 'complaint',
          complaint_id: dispute!.id,
          complaint_party: party,
          vendor_id: vendor?.id ?? null,
          customer_id: party === 'customer' ? dispute!.raised_by : null,
          created_by: user!.id,
          is_readonly: closed,
        }).select('id').single();

        if (error) {
          if (error.code === '23505') id = (await find()).data?.id ?? null;
          if (!id) throw error;
        } else {
          id = data.id;
          created = true;
        }
      }

      const members: any[] = [{ conversation_id: id, user_id: memberId, role: memberRole, left_at: null }];
      if (admin) members.push({ conversation_id: id, user_id: user!.id, role: 'admin', left_at: null });
      const { error: pErr } = await db.from('chat_conversation_participants')
        .upsert(members, { onConflict: 'conversation_id,user_id' });
      if (pErr) throw pErr;

      if (created) await postMessage(db, id as string, null, 'system', welcome);
      return id as string;
    }

    const customerThreadId = await thread(
      'customer', null, dispute.raised_by, 'member',
      'Your dispute has been received. Our team will review it and may ask you questions here.'
    );

    const vendorThreadIds: string[] = [];
    if (admin) {
      const { data: items } = await db.from('order_items').select('vendor_id').eq('order_id', dispute.order_id);
      const vendorIds = Array.from(new Set((items ?? []).map(i => i.vendor_id).filter(Boolean)));

      if (vendorIds.length) {
        const { data: vendors } = await db.from('vendors').select('id, user_id').in('id', vendorIds);
        for (const v of vendors ?? []) {
          vendorThreadIds.push(await thread(
            'vendor', v, v.user_id, 'vendor_owner',
            'A customer has raised a dispute on an order that includes your items. Our team may ask for your response here.'
          ));
        }
      }
    }

    return NextResponse.json({ customerThreadId, vendorThreadIds });
  } catch (e: any) {
    return fail(500, e?.message ?? 'Could not open dispute chat');
  }
}
