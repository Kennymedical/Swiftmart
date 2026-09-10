import { createClient } from '@/lib/supabase/server';
import { StoryBar } from '@/components/feed/story-bar';
import { BottomNav } from '@/components/layout/bottom-nav';
import { PostFab } from '@/components/feed/PostFab';

async function getFeedData() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: posts } = await supabase
    .from('posts')
    .select(
      `id, content, image_urls, like_count, comment_count, share_count, created_at,
       author:profiles!posts_author_id_fkey(id, username, full_name, avatar_url),
       vendor:vendors(id, slug, business_name),
       product:products(id, slug, name, price_kobo, images)`,
    )
    .order('created_at', { ascending: false })
    .limit(30);

  let profile: { username: string; avatar_url: string | null } | null = null;
  let unreadNotifications = 0;

  if (user) {
    const [{ data: profileRow }, { count }] = await Promise.all([
      supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single(),
      supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('read_at', null),
    ]);
    profile = profileRow;
    unreadNotifications = count ?? 0;
  }

  return { feed: posts ?? [], profile, unreadNotifications };
}

export default async function FeedPage() {
  const { feed, profile, unreadNotifications } = await getFeedData();

  return (
    <div className="min-h-screen bg-[#0F172A] pb-24">
      <div className="mx-auto max-w-lg">
        <StoryBar currentUserAvatarUrl={profile?.avatar_url} />

        {feed.length === 0 ? (
          <p className="py-16 text-center text-gray-500">
            No posts yet — follow some vendors to fill your feed.
          </p>
        ) : (
          <div className="px-4 pt-4 space-y-4">
            {feed.map((post: any) => {
              const image = post.product?.images?.[0] ?? post.image_urls?.[0] ?? null;

              return (
                <div
                  key={post.id}
                  className="bg-[#1E293B] border border-[#D4AF37]/20 rounded-2xl p-4 shadow-[0_0_15px_rgba(212,175,55,0.1)]"
                >
                  {/* HEADER */}
                  <div className="flex items-center gap-3 mb-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        post.author?.avatar_url ||
                        `https://ui-avatars.com/api/?name=${post.author?.username}&background=D4AF37&color=0F172A`
                      }
                      className="w-10 h-10 rounded-full border-2 border-[#D4AF37]"
                      alt={post.author?.username ?? 'user'}
                    />
                    <div>
                      <p className="font-bold text-white">{post.author?.username}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(post.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* IMAGE (product photo if attached, else the post's own image) */}
                  {image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image} className="w-full rounded-xl mb-3" alt={post.product?.name ?? 'post image'} />
                  )}

                  {/* PRODUCT INFO (only if a product is attached) */}
                  {post.product && (
                    <h2 className="text-lg font-bold text-white mb-1">{post.product.name}</h2>
                  )}

                  {post.content && <p className="text-sm text-gray-300 mb-3">{post.content}</p>}

                  {/* PRICE + BUTTON (only if a product is attached) */}
                  {post.product && (
                    <div className="flex items-center justify-between">
                      <p className="text-2xl font-extrabold text-[#D4AF37]">
                        ₦{(post.product.price_kobo / 100).toLocaleString()}
                      </p>
                      <button className="bg-[#D4AF37] text-[#0F172A] font-bold px-5 py-2 rounded-xl hover:scale-105 transition">
                        Buy Now
                      </button>
                    </div>
                  )}

                  {/* LIKE / COMMENT / SHARE */}
                  <div className="flex gap-6 mt-4 pt-3 border-t border-[#D4AF37]/10">
                    <button className="text-gray-400 text-sm">❤️ {post.like_count}</button>
                    <button className="text-gray-400 text-sm">💬 {post.comment_count}</button>
                    <button className="text-gray-400 text-sm">📤 Share</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <PostFab />

      <BottomNav
        username={profile?.username}
        avatarUrl={profile?.avatar_url}
        unreadNotifications={unreadNotifications}
      />
    </div>
  );
      }
    
