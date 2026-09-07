'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface FollowButtonProps {
  targetUserId: string;
  currentUserId: string | null;
  initiallyFollowing: boolean;
  size?: 'sm' | 'md';
}

export function FollowButton({
  targetUserId,
  currentUserId,
  initiallyFollowing,
  size = 'sm',
}: FollowButtonProps) {
  const supabase = createClient();
  const router = useRouter();
  const [following, setFollowing] = useState(initiallyFollowing);
  const [loading, setLoading] = useState(false);

  // Never render a follow button for your own content — Facebook doesn't
  // show "Follow" on your own posts, and neither should we.
  if (currentUserId === targetUserId) return null;

  async function toggle() {
    if (!currentUserId) {
      router.push('/login');
      return;
    }
    setLoading(true);
    const next = !following;
    setFollowing(next); // optimistic — the DB trigger keeps counts correct regardless

    const { error } = next
      ? await supabase.from('follows').insert({ follower_id: currentUserId, following_id: targetUserId })
      : await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('following_id', targetUserId);

    if (error) setFollowing(!next); // revert on failure
    setLoading(false);
  }

  const base =
    size === 'sm'
      ? 'rounded-md px-3 py-1 text-xs font-semibold'
      : 'rounded-md px-4 py-1.5 text-sm font-semibold';

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`${base} ${
        following ? 'border border-gray-300 text-gray-700' : 'bg-blue-600 text-white'
      } disabled:opacity-50`}
    >
      {following ? 'Following' : 'Follow'}
    </button>
  );
}
