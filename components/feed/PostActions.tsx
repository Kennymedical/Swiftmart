'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export function PostActions({
  postId,
  initialLiked,
  initialLikeCount,
  commentCount,
}: {
  postId: string;
  initialLiked: boolean;
  initialLikeCount: number;
  commentCount: number;
}) {
  const supabase = createClient();
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [busy, setBusy] = useState(false);
  const [shared, setShared] = useState(false);

  async function toggleLike() {
    if (busy) return;
    setBusy(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = '/login';
      return;
    }

    if (liked) {
      // optimistic update, then real delete
      setLiked(false);
      setLikeCount((c) => c - 1);
      await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', user.id);
    } else {
      setLiked(true);
      setLikeCount((c) => c + 1);
      await supabase.from('likes').insert({ post_id: postId, user_id: user.id });
    }
    setBusy(false);
  }

  async function handleShare() {
    const url = `${window.location.origin}/posts/${postId}`;
    if (navigator.share) {
      try {
        await navigator.share({ url });
      } catch {
        // user cancelled share sheet — not an error
      }
    } else {
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 1500);
    }
  }

  return (
    <div className="flex gap-6 mt-4 pt-3 border-t border-[#D4AF37]/10">
      <button
        onClick={toggleLike}
        disabled={busy}
        className={`text-sm ${liked ? 'text-red-500' : 'text-gray-400'}`}
      >
        {liked ? '❤️' : '🤍'} {likeCount}
      </button>

      <Link href={`/posts/${postId}`} className="text-gray-400 text-sm">
        💬 {commentCount}
      </Link>

      <button onClick={handleShare} className="text-gray-400 text-sm">
        📤 {shared ? 'Copied!' : 'Share'}
      </button>
    </div>
  );
  }
        
