import { createClient } from '@/lib/supabase/server';
import { AdminPostActions } from './AdminPostActions';

export default async function AdminPostsPage() {
  const supabase = createClient();

  const { data: posts } = await supabase
    .from('posts')
    .select(
      `id, content, image_urls, created_at,
       author:profiles!posts_author_id_fkey(username),
       product:products(name, price_kobo, images)`,
    )
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h2 className="text-xs font-bold uppercase tracking-wider text-[#D4AF37] mb-3 px-1">
        Pending Feed Posts
      </h2>
      {(!posts || posts.length === 0) ? (
        <p className="text-center text-[#A8B0C5] py-16">No posts pending approval.</p>
      ) : (
        <div className="space-y-3.5">
          {posts.map((p: any) => {
            const image = p.product?.images?.[0] ?? p.image_urls?.[0] ?? null;
            return (
              <div
                key={p.id}
                className="bg-gradient-to-br from-[#142850] to-[#1B2F5E] border border-[#D4AF37]/25 rounded-2xl shadow-[0_4px_20px_rgba(212,175,55,0.08)] p-4 flex gap-3.5"
              >
                <div className="h-16 w-16 flex-shrink-0 rounded-xl bg-[#0A1931] border border-[#D4AF37]/20 overflow-hidden">
                  {image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[#A8B0C5]">@{p.author?.username}</p>
                  {p.product && (
                    <p className="text-sm font-bold text-[#E8C874] mt-0.5">
                      {p.product.name} — ₦{(p.product.price_kobo / 100).toLocaleString()}
                    </p>
                  )}
                  {p.content && <p className="text-xs text-[#F5F7FA] line-clamp-2 mt-1">{p.content}</p>}
                  <div className="mt-2.5">
                    <AdminPostActions postId={p.id} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
