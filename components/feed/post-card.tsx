'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { formatNaira } from '@/lib/format';
import { FollowButton } from '@/components/shared/follow-button';

export interface PostCardData {
  id: string;
  content: string | null;
  image_urls: string[];
  like_count: number;
  comment_count: number;
  share_count: number;
  created_at: string;
  author: { id: string; username: string; full_name: string | null; avatar_url: string | null };
  vendor: { id: string; slug: string; business_name: string } | null;
  product: {
    id: string;
    slug: string;
    name: string;
    price_kobo: number;
    images: string[];
  } | null;
  liked_by_me: boolean;
  saved_by_me: boolean;
  followed_by_me: boolean;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user: { username: string; full_name: string | null; avatar_url: string | null };
}

export function PostCard({ post, currentUserId }: { post: PostCardData; currentUserId: string | null }) {
  const supabase = createClient();
  const [liked, setLiked] = useState(post.liked_by_me);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [saved, setSaved] = useState(post.saved_by_me);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentCount, setCommentCount] = useState(post.comment_count);
  const [commentDraft, setCommentDraft] = useState('');
  const [copied, setCopied] = useState(false);

  async function toggleLike() {
    if (!currentUserId) return redirectToLogin();
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1)); // optimistic; DB trigger is the source of truth on reload

    const { error } = next
      ? await supabase.from('likes').insert({ post_id: post.id, user_id: currentUserId })
      : await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', currentUserId);

    if (error) {
      setLiked(!next);
      setLikeCount((c) => c + (next ? -1 : 1));
    }
  }

  async function toggleSave() {
    if (!currentUserId) return redirectToLogin();
    const next = !saved;
    setSaved(next);
    const { error } = next
      ? await supabase.from('saved_posts').insert({ post_id: post.id, user_id: currentUserId })
      : await supabase.from('saved_posts').delete().eq('post_id', post.id).eq('user_id', currentUserId);
    if (error) setSaved(!next);
  }

  async function openComments() {
    setShowComments((v) => !v);
    if (!showComments && comments.length === 0) {
      const { data } = await supabase
        .from('comments')
        .select('id, content, created_at, user:profiles(username, full_name, avatar_url)')
        .eq('post_id', post.id)
        .order('created_at', { ascending: true });
      setComments((data as any) ?? []);
    }
  }

  async function submitComment() {
    if (!currentUserId) return redirectToLogin();
    const content = commentDraft.trim();
    if (!content) return;

    setCommentDraft('');
    const { data, error } = await supabase
      .from('comments')
      .insert({ post_id: post.id, user_id: currentUserId, content })
      .select('id, content, created_at, user:profiles(username, full_name, avatar_url)')
      .single();

    if (!error && data) {
      setComments((c) => [...c, data as any]);
      setCommentCount((c) => c + 1);
    }
  }

  async function handleShare() {
    const url = `${window.location.origin}/post/${post.id}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    // share_count is incremented via a trigger-free best-effort update here
    // since sharing isn't a security-sensitive action worth an RPC.
    await supabase.from('posts').update({ share_count: post.share_count + 1 }).eq('id', post.id);
  }

  function redirectToLogin() {
    window.location.href = '/login';
  }

  const displayName = post.author.full_name || post.author.username;

  return (
    <article className="mb-2 bg-white sm:rounded-lg sm:border">
      {/* Header */}
      <div className="flex items-center justify-between p-3">
        <Link href={`/profile/${post.author.username}`} className="flex items-center gap-2">
          <div className="h-10 w-10 overflow-hidden rounded-full bg-gray-200">
            {post.author.avatar_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.author.avatar_url} alt={displayName} className="h-full w-full object-cover" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">
              {displayName}
              {post.vendor && <span className="ml-1 font-normal text-gray-500">→ {post.vendor.business_name}</span>}
            </p>
            <p className="text-xs text-gray-400">{timeAgo(post.created_at)}</p>
          </div>
        </Link>
        <FollowButton
          targetUserId={post.author.id}
          currentUserId={currentUserId}
          initiallyFollowing={post.followed_by_me}
        />
      </div>

      {/* Body */}
      {post.content && <p className="whitespace-pre-line px-3 pb-2 text-sm">{post.content}</p>}

      {post.image_urls.length > 0 && (
        <div className="bg-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.image_urls[0]} alt="" className="max-h-[480px] w-full object-cover" />
        </div>
      )}

      {post.product && (
        <Link
          href={`/products/${post.product.slug}`}
          className="mx-3 mb-3 flex items-center gap-3 rounded-md border p-2"
        >
          <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
            {post.product.images[0] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.product.images[0]}
                alt={post.product.name}
                className="h-full w-full object-cover"
              />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{post.product.name}</p>
            <p className="text-sm font-semibold">{formatNaira(post.product.price_kobo)}</p>
          </div>
        </Link>
      )}

      {/* Engagement counts */}
      {(likeCount > 0 || commentCount > 0) && (
        <div className="flex justify-between px-3 pb-1 text-xs text-gray-500">
          <span>{likeCount > 0 && `${likeCount} like${likeCount === 1 ? '' : 's'}`}</span>
          <span>{commentCount > 0 && `${commentCount} comment${commentCount === 1 ? '' : 's'}`}</span>
        </div>
      )}

      {/* Footer actions */}
      <div className="flex items-center border-t px-1 py-1 text-sm">
        <FooterButton active={liked} label={liked ? 'Liked' : 'Like'} onClick={toggleLike} />
        <FooterButton label="Comment" onClick={openComments} />
        <FooterButton label={copied ? 'Copied!' : 'Share'} onClick={handleShare} />
        <FooterButton active={saved} label={saved ? 'Saved' : 'Save'} onClick={toggleSave} />
      </div>

      {/* Comments */}
      {showComments && (
        <div className="border-t px-3 py-2">
          <div className="space-y-2">
            {comments.map((c) => (
              <div key={c.id} className="text-sm">
                <span className="font-semibold">{c.user.full_name || c.user.username}</span>{' '}
                <span>{c.content}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitComment()}
              placeholder="Write a comment…"
              className="flex-1 rounded-full border px-3 py-1.5 text-sm"
            />
            <button onClick={submitComment} className="text-sm font-medium text-blue-600">
              Post
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

function FooterButton({
  label,
  onClick,
  active,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-md py-2 text-center text-sm font-medium ${
        active ? 'text-blue-600' : 'text-gray-600'
      } hover:bg-gray-50`}
    >
      {label}
    </button>
  );
}

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
