import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

async function getActiveStories() {
  const supabase = createClient();
  const { data } = await supabase
    .from('stories')
    .select('id, media_url, created_at, vendor:vendors(id, slug, business_name, banner_url, user:profiles(avatar_url))')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(20);
  return data ?? [];
}

export async function StoryBar({ currentUserAvatarUrl }: { currentUserAvatarUrl?: string | null }) {
  const stories = await getActiveStories();

  // Group by vendor so each vendor shows once in the bar (tapping it opens
  // their full story stack) rather than one tile per individual story.
  const byVendor = new Map<string, (typeof stories)[number]>();
  for (const story of stories) {
    const vendorId = (story.vendor as any)?.id;
    if (vendorId && !byVendor.has(vendorId)) byVendor.set(vendorId, story);
  }

  return (
    <div className="flex gap-3 overflow-x-auto border-b bg-white p-3 scrollbar-none">
      <Link href="/stories/create" className="flex w-20 flex-shrink-0 flex-col items-center gap-1">
        <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-gray-200 bg-gray-100">
          {currentUserAvatarUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={currentUserAvatarUrl} alt="You" className="h-full w-full object-cover" />
          )}
          <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-sm font-bold text-white">
            +
          </span>
        </div>
        <span className="text-center text-xs text-gray-600">Create story</span>
      </Link>

      {Array.from(byVendor.values()).map((story) => {
        const vendor = story.vendor as any;
        return (
          <Link
            key={vendor.id}
            href={`/vendor/${vendor.slug}`}
            className="flex w-20 flex-shrink-0 flex-col items-center gap-1"
          >
            <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-blue-600 p-0.5">
              <div className="h-full w-full overflow-hidden rounded-full bg-gray-100">
                {vendor.user?.avatar_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={vendor.user.avatar_url}
                    alt={vendor.business_name}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
            </div>
            <span className="line-clamp-1 text-center text-xs text-gray-600">
              {vendor.business_name}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
