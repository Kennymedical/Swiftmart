import { createClient } from '@/lib/supabase/server';
import { StoryBar } from '@/components/feed/story-bar';
import { PostCard, type PostCardData } from '@/components/feed/post-card';
import { BottomNav } from '@/components/layout/bottom-nav';

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
    <div className="min-h-screen bg-gray-100 pb-16 sm:pb-0">
      <div className="mx-auto max-w-lg">
        <StoryBar currentUserAvatarUrl={profile?.avatar_url} />

        {feed.length === 0 ? (
          <p className="py-16 text-center text-gray-500">
            No posts yet — follow some vendors to fill your feed.
          </p>
        ) : (
          <div className="space-y-2 py-2">
            {feed.map((post) => (
              <PostCard key={post.id} post={post} currentUserId={currentUserId} />
            ))}
          </div>
        )}
      </div>

      <BottomNav
        username={profile?.username}
        avatarUrl={profile?.avatar_url}
        unreadNotifications={unreadNotifications}
      />
    </div>
  );
}
