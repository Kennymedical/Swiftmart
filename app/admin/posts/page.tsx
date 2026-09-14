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
      {(!posts || posts.length === 0) ? (
        <p className="text-center text-gray-500 py-16">No posts pending approval.</p>
      ) : (
        <div className="space-y-3">
          {posts.map((p: any) => {
            const image = p.product?.images?.[0] ?? p.image_urls?.[0] ?? null;
            return (
              <div key={p.id} className="bg-white rounded-2xl shadow-sm p-4 flex gap-3">
                <div className="h-16 w-16 flex-shrink-0 rounded-lg bg-gray-100 overflow-hidden">
                  {image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">@{p.author?.username}</p>
                  {p.product && (
                    <p className="text-sm font-semibold text-[#0F172A]">
                      {p.product.name} — ₦{(p.product.price_kobo / 100).toLocaleString()}
                    </p>
                  )}
                  {p.content && <p className="text-xs text-gray-600 line-clamp-2 mt-1">{p.content}</p>}
                  <div className="mt-2">
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
          
