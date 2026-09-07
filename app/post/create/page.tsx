'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function CreatePostPage() {
  const router = useRouter();
  const supabase = createClient();

  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!content.trim() && !imageFile) {
      setError('Add some text or an image before posting.');
      return;
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError('You must be logged in to post.');
      setLoading(false);
      return;
    }

    let imageUrls: string[] = [];

    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('post-image')
        .upload(filePath, imageFile);

      if (uploadError) {
        setError(uploadError.message);
        setLoading(false);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('post-image').getPublicUrl(filePath);

      imageUrls = [publicUrl];
    }

    const { error: insertError } = await supabase.from('posts').insert({
      author_id: user.id,
      content: content.trim() || null,
      image_urls: imageUrls,
    });

    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    router.push('/');
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-24">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm p-6 mt-6">
        <h1 className="text-xl font-semibold text-[#0F172A] mb-6">
          Create post
        </h1>

        <form onSubmit={handleSubmit}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            rows={4}
            className="w-full rounded-xl border-2 border-gray-200 p-3 mb-4 focus:border-[#D4AF37] outline-none resize-none"
          />

          <label className="block mb-4">
            <span className="text-sm font-medium text-gray-700 mb-1 block">
              Photo (optional)
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full text-sm text-gray-600"
            />
          </label>

          {imagePreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imagePreview}
              alt="Preview"
              className="w-full rounded-xl mb-4 max-h-64 object-cover"
            />
          )}

          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0F172A] text-[#D4AF37] font-bold py-3 rounded-xl border-2 border-[#D4AF37] hover:bg-[#1E293B] transition disabled:opacity-50"
          >
            {loading ? 'Posting...' : 'Post'}
          </button>
        </form>
      </div>
    </div>
  );
  }
  
