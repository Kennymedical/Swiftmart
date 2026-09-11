'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AddProductPage() {
  const router = useRouter();
  const supabase = createClient();

  const [checking, setChecking] = useState(true);
  const [vendorId, setVendorId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priceNaira, setPriceNaira] = useState<number | ''>('');
  const [compareAtNaira, setCompareAtNaira] = useState<number | ''>('');
  const [stock, setStock] = useState<number | ''>('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function checkVendor() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setChecking(false);
        return;
      }
      const { data: vendor } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', user.id)
        .single();
      setVendorId(vendor?.id ?? null);
      setChecking(false);
    }
    checkVendor();
  }, []);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  }

  function slugify(text: string) {
    return (
      text
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36)
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!name.trim() || !priceNaira || !stock) {
      setError('Name, price, and stock are required.');
      return;
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !vendorId) {
      setError('You must be a vendor to add products.');
      setLoading(false);
      return;
    }

    let images: string[] = [];
    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop();
      const filePath = `${user.id}/products/${Date.now()}.${fileExt}`;

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
      images = [publicUrl];
    }

    const { error: insertError } = await supabase.from('products').insert({
      vendor_id: vendorId,
      name: name.trim(),
      slug: slugify(name),
      description: description.trim() || null,
      images,
      price_kobo: Math.round(Number(priceNaira) * 100),
      compare_at_kobo: compareAtNaira ? Math.round(Number(compareAtNaira) * 100) : null,
      stock: Number(stock),
      status: 'draft', // admin approves before it appears in the Shop
    });

    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    router.push('/vendor');
    router.refresh();
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!vendorId) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm p-6 mt-6 text-center">
          <h1 className="text-xl font-semibold text-[#0F172A] mb-2">
            Vendors only
          </h1>
          <p className="text-sm text-gray-500 mb-4">
            You need to be a registered vendor to add products.
          </p>
          <a
            href="/vendor/register"
            className="inline-block bg-[#0F172A] text-[#D4AF37] font-bold py-3 px-6 rounded-xl border-2 border-[#D4AF37]"
          >
            Become a Vendor
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-24">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm p-6 mt-6">
        <h1 className="text-xl font-semibold text-[#0F172A] mb-1">Add Product</h1>
        <p className="text-sm text-gray-500 mb-6">
          Submitted products need admin approval before they appear in the Shop.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Product name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border-2 border-gray-200 p-3 focus:border-[#D4AF37] outline-none"
              placeholder="e.g. Wireless Earbuds"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-xl border-2 border-gray-200 p-3 focus:border-[#D4AF37] outline-none resize-none"
              placeholder="Describe the product"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 mb-1 block">Price (₦)</label>
              <input
                type="number"
                required
                min={1}
                value={priceNaira}
                onChange={(e) => setPriceNaira(e.target.value ? Number(e.target.value) : '')}
                className="w-full rounded-xl border-2 border-gray-200 p-3 focus:border-[#D4AF37] outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Compare-at (₦, optional)
              </label>
              <input
                type="number"
                min={0}
                value={compareAtNaira}
                onChange={(e) => setCompareAtNaira(e.target.value ? Number(e.target.value) : '')}
                className="w-full rounded-xl border-2 border-gray-200 p-3 focus:border-[#D4AF37] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Stock quantity</label>
            <input
              type="number"
              required
              min={0}
              value={stock}
              onChange={(e) => setStock(e.target.value ? Number(e.target.value) : '')}
              className="w-full rounded-xl border-2 border-gray-200 p-3 focus:border-[#D4AF37] outline-none"
            />
          </div>

          <label className="block">
            <span className="text-sm font-medium text-gray-700 mb-1 block">Product photo</span>
            <input type="file" accept="image/*" onChange={handleImageChange} className="w-full text-sm" />
          </label>

          {imagePreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imagePreview} alt="Preview" className="w-full rounded-xl max-h-64 object-cover" />
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0F172A] text-[#D4AF37] font-bold py-3 rounded-xl border-2 border-[#D4AF37] disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Add Product'}
          </button>
        </form>
      </div>
    </div>
  );
  }
  
