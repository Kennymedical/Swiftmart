import { createClient } from '@/lib/supabase/server';
import { StoryBar } from '@/components/feed/story-bar';
import { PostCard, type PostCardData } from '@/components/feed/post-card';
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

  let likedPostIds = new Set<string>();
  let savedPostIds = new Set<string>();
  let followedAuthorIds = new Set<string>();
  let profile: { username: string; avatar_url: string | null } | null = null;
  let unreadNotifications = 0;

  if (user && posts && posts.length > 0) {
    const postIds = posts.map((p) => p.id);
    const authorIds = [...new Set(posts.map((p) => (p.author as any).id))];

    const [{ data: likes }, { data: saves }, { data: follows }, { data: profileRow }, { count }] =
      await Promise.all([
        supabase.from('likes').select('post_id').eq('user_id', user.id).in('post_id', postIds),
        supabase.from('saved_posts').select('post_id').eq('user_id', user.id).in('post_id', postIds),
        supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id)
          .in('following_id', authorIds),
        supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single(),
        supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .is('read_at', null),
      ]);

    likedPostIds = new Set((likes ?? []).map((l) => l.post_id));
    savedPostIds = new Set((saves ?? []).map((s) => s.post_id));
    followedAuthorIds = new Set((follows ?? []).map((f) => f.following_id));
    profile = profileRow;
    unreadNotifications = count ?? 0;
  }

  const feed: PostCardData[] = (posts ?? []).map((p: any) => ({
    ...p,
    liked_by_me: likedPostIds.has(p.id),
    saved_by_me: savedPostIds.has(p.id),
    followed_by_me: followedAuthorIds.has(p.author.id),
  }));

  return { feed, currentUserId: user?.id ?? null, profile, unreadNotifications };
}

export default async function FeedPage() {
  const { feed, currentUserId, profile, unreadNotifications } = await getFeedData();

  return (
  <div className="min-h-screen bg-[#0F172A] pb-24">
    <div className="mx-auto max-w-lg">
      <StoryBar currentUserAvatarUrl={profile?.avatar_url} />

      {feed.length === 0? (
        <p className="py-16 text-center text-gray-500">
          No posts yet - follow some vendors to fill your feed.
        </p>
      ) : (
        <div className="px-4 pt-4 space-y-4">
          {feed.map((post) => (
            <div 
              key={post.id}
              className="bg-[#1E293B] border-[#D4AF37]/20 rounded-2xl p-4 shadow-[0_0_15px_rgba(212,175,55,0.1)]"
            >
              {/* HEADER */}
              <div className="flex items-center gap-3 mb-3">
                <img 
                  src={post.author.avatar_url || `https://ui-avatars.com/api/?name=${post.author.username}&background=D4AF37&color=0F172A`} 
                  className="w-10 h-10 rounded-full border-2 border-[#D4AF37]" 
                  alt={post.author.username}
                />
                <div>
                  <p className="font-bold text-white">{post.author.username}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(post.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* PRODUCT IMAGE */}
              <img 
                src={post.product.images[0] || '/placeholder.jpg'} 
                className="w-full rounded-xl mb-3" 
                alt={post.product.name} 
              />

              {/* PRODUCT INFO */}
              <h2 className="text-lg font-bold text-white mb-1">{post.product.name}</h2>
              <p className="text-sm text-gray-300 mb-3">{post.content}</p>

              {/* PRICE + BUTTON */}
              <div className="flex items-center justify-between">
                <p className="text-2xl font-extrabold text-[#D4AF37]">₦{(post.product.price_kobo / 100).toLocaleString()}</p>
                <button className="bg-[#D4AF37] text-[#0F172A] font-bold px-5 py-2 rounded-xl hover:scale-105 transition">
                  Buy Now
                </button>
              </div>

              {/* LIKE / COMMENT / SHARE */}
              <div className="flex gap-6 mt-4 pt-3 border-t border-[#D4AF37]/10">
                <button className="text-gray-400 text-sm">❤️ {post.like_count}</button>
                <button className="text-gray-400 text-sm">💬 {post.comment_count}</button>
                <button className="text-gray-400 text-sm">📤 Share</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
)
