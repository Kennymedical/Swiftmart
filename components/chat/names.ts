// Works out the title/avatar shown for each conversation, from the point of view of the signed-in user.
// Reads only public views (vendors_public, profiles_public), never private tables.

export type ConvRow = {
  id: string;
  type: string;
  title: string | null;
  customer_id: string | null;
  vendor_id: string | null;
  support_topic: string | null;
  complaint_party: string | null;
  is_readonly: boolean;
  last_message_at: string | null;
  last_message_preview: string | null;
  created_at: string;
};

export type Title = { title: string; sub: string | null; image: string | null };

export const CONV_COLUMNS =
  'id, type, title, customer_id, vendor_id, support_topic, complaint_party, is_readonly, last_message_at, last_message_preview, created_at';

const nameOf = (p: any): string =>
  p?.full_name ?? p?.username ?? p?.display_name ?? p?.name ?? 'SwiftMart user';
const avatarOf = (p: any): string | null => p?.avatar_url ?? p?.avatar ?? null;
const cap = (s: string | null) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : null);

export async function resolveTitles(
  supabase: any,
  convs: ConvRow[],
  myId: string
): Promise<Record<string, Title>> {
  const out: Record<string, Title> = {};

  // Vendor chats: customers see the store name, vendors see the customer.
  const vendorIds = Array.from(
    new Set(convs.filter(c => c.type === 'vendor' && c.vendor_id && c.customer_id === myId).map(c => c.vendor_id as string))
  );
  const customerIds = Array.from(
    new Set(convs.filter(c => c.type === 'vendor' && c.customer_id && c.customer_id !== myId).map(c => c.customer_id as string))
  );
  const socialIds = convs.filter(c => c.type === 'social').map(c => c.id);

  const [vendorsRes, othersRes] = await Promise.all([
    vendorIds.length
      ? supabase.from('vendors_public').select('id, business_name, banner_url').in('id', vendorIds)
      : Promise.resolve({ data: [] }),
    socialIds.length
      ? supabase.from('chat_conversation_participants').select('conversation_id, user_id')
          .in('conversation_id', socialIds).neq('user_id', myId)
      : Promise.resolve({ data: [] }),
  ]);

  const vendorMap: Record<string, any> = {};
  for (const v of vendorsRes.data ?? []) vendorMap[v.id] = v;

  const otherByConv: Record<string, string> = {};
  for (const r of othersRes.data ?? []) otherByConv[r.conversation_id] = r.user_id;

  const profileIds = Array.from(new Set([...customerIds, ...Object.values(otherByConv)]));
  const profRes = profileIds.length
    ? await supabase.from('profiles_public').select('*').in('id', profileIds)
    : { data: [] };
  const profileMap: Record<string, any> = {};
  for (const p of profRes.data ?? []) profileMap[p.id] = p;

  for (const c of convs) {
    if (c.type === 'vendor') {
      if (c.customer_id === myId) {
        const v = c.vendor_id ? vendorMap[c.vendor_id] : null;
        out[c.id] = { title: v?.business_name ?? 'Store', sub: null, image: v?.banner_url ?? null };
      } else {
        const p = c.customer_id ? profileMap[c.customer_id] : null;
        out[c.id] = { title: nameOf(p), sub: 'Customer', image: avatarOf(p) };
      }
    } else if (c.type === 'support') {
      out[c.id] = { title: 'SwiftMart Support', sub: cap(c.support_topic), image: null };
    } else if (c.type === 'complaint') {
      out[c.id] = {
        title: 'SwiftMart Disputes',
        sub: c.complaint_party === 'vendor' ? 'Vendor response' : 'Your dispute',
        image: null,
      };
    } else if (c.type === 'group') {
      out[c.id] = { title: c.title ?? 'Group', sub: 'Group', image: null };
    } else {
      const p = profileMap[otherByConv[c.id]];
      out[c.id] = { title: nameOf(p), sub: null, image: avatarOf(p) };
    }
  }
  return out;
}
