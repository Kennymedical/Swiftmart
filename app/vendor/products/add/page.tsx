'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Plus, Tag } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
}

const DEFAULT_CATEGORIES = [
  { name: 'Electronics', slug: 'electronics' },
  { name: "Fashion (Men's Wear)", slug: 'fashion-mens-wear' },
  { name: "Fashion (Women's Wear)", slug: 'fashion-womens-wear' },
  { name: "Fashion (Children's Wear)", slug: 'fashion-childrens-wear' },
  { name: 'Groceries & Food', slug: 'groceries-food' },
  { name: 'Health & Beauty', slug: 'health-beauty' },
  { name: 'Home & Kitchen', slug: 'home-kitchen' },
];

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

  // Category state
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [categoryLoading, setCategoryLoading] = useState(false);

  useEffect(() => {
    async function init() {
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

      // Load existing categories from DB
      const { data: dbCategories } = await supabase
        .from('categories')
        .select('id, name, slug')
        .order('name', { ascending: true });

      if (dbCategories && dbCategories.length > 0) {
        setCategories(dbCategories);
        setSelectedCategoryId(dbCategories[0].id);
      } else {
        // Fallback: seed or show defaults
        setCategories([]);
      }

      setChecking(false);
    }
    init();
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

  async function handleCreateCustomCategory() {
    if (!customCategoryName.trim()) return;
    setCategoryLoading(true);
    setError('');

    const newSlug = slugify(customCategoryName);
    const { data, error: catError } = await supabase
      .from('categories')
      .insert({
        name: customCategoryName.trim(),
        slug: newSlug,
      })
      .select('id, name, slug')
      .single();

    setCategoryLoading(false);

    if (catError) {
      // If table doesn't have insert policy yet or unique conflict, fallback gracefully
      setError(`Could not add category: ${catError.message}`);
      return;
    }

    if (data) {
      setCategories((prev) => [...prev, data]);
      setSelectedCategoryId(data.id);
      setCustomCategoryName('');
      setIsCreatingCustom(false);
    }
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
      category_id: selectedCategoryId || null,
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
      <div className="min-h-screen flex items-center justify-center bg-[#0A1931] text-[#F5F7FA]">
        <p className="text-[#A8B0C5]">Loading...</p>
      </div>
    );
  }

  if (!vendorId) {
    return (
      <div className="min-h-screen bg-[#0A1931] text-[#F5F7FA] p-4">
        <div className="max-w-md mx-auto bg-gradient-to-b from-[#142850] to-[#1B2F5E] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.37)] border border-[#D4AF37]/25 p-6 text-[#F5F7FA] mt-6 text-center">
          <h1 className="text-xl font-semibold text-[#E9C86A] mb-2">
            Vendors only
          </h1>
          <p className="text-sm text-[#A8B0C5] mb-4">
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
    <div className="min-h-screen bg-[#0A1931] text-[#F5F7FA] p-4 pb-24">
      <div className="max-w-md mx-auto bg-gradient-to-b from-[#142850] to-[#1B2F5E] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.37)] border border-[#D4AF37]/25 p-6 text-[#F5F7FA] mt-6">
        <h1 className="text-xl font-semibold text-[#E9C86A] mb-1">Add Product</h1>
        <p className="text-sm text-[#A8B0C5] mb-6">
          Submitted products need admin approval before they appear in the Shop.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-[#A8B0C5] mb-1 block">Product name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border-2 border-[#D4AF37]/20 bg-[#0F2140] text-[#F5F7FA] p-3 focus:border-[#D4AF37] outline-none"
              placeholder="e.g. Wireless Earbuds"
            />
          </div>

          {/* Category Selector & Custom Creation */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-[#A8B0C5] flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Product Category / Filter</span>
              </label>
              <button
                type="button"
                onClick={() => setIsCreatingCustom(!isCreatingCustom)}
                className="text-xs text-[#E8C874] hover:underline flex items-center gap-1 font-semibold"
              >
                <Plus className="w-3 h-3" />
                <span>{isCreatingCustom ? 'Select existing' : 'Add custom'}</span>
              </button>
            </div>

            {!isCreatingCustom ? (
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="w-full rounded-xl border border-[#D4AF37]/30 bg-[#0F2140] text-[#F5F7FA] p-3 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none transition appearance-none"
              >
                <option value="" className="bg-[#0A1931] text-[#A8B0C5]">-- Select Category --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#0A1931] text-[#F5F7FA] py-1">
                    {c.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customCategoryName}
                  onChange={(e) => setCustomCategoryName(e.target.value)}
                  placeholder="New category (e.g. Smart Watches)"
                  className="flex-1 rounded-xl border-2 border-[#D4AF37]/20 bg-[#0F2140] text-[#F5F7FA] p-2.5 text-sm focus:border-[#D4AF37] outline-none"
                />
                <button
                  type="button"
                  disabled={categoryLoading || !customCategoryName.trim()}
                  onClick={handleCreateCustomCategory}
                  className="px-4 py-2 rounded-xl bg-[#D4AF37] text-[#0A1931] font-bold text-xs disabled:opacity-50"
                >
                  {categoryLoading ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
            <p className="text-[11px] text-[#8A94B0]">
              Categorizing your product helps shoppers find it using catalog filter chips.
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-[#A8B0C5] mb-1 block">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-xl border-2 border-[#D4AF37]/20 bg-[#0F2140] text-[#F5F7FA] p-3 focus:border-[#D4AF37] outline-none resize-none"
              placeholder="Describe the product"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-sm font-medium text-[#A8B0C5] mb-1 block">Your Vendor Price (₦)</label>
              <input
                type="number"
                required
                min={1}
                value={priceNaira}
                onChange={(e) => setPriceNaira(e.target.value ? Number(e.target.value) : '')}
                className="w-full rounded-xl border-2 border-[#D4AF37]/20 bg-[#0F2140] text-[#F5F7FA] p-3 focus:border-[#D4AF37] outline-none"
              />
              {priceNaira ? (
                <p className="text-xs text-emerald-700 font-bold mt-1">
                  Customer Cart Price (+20%): ₦{(Number(priceNaira) * 1.2).toLocaleString()}
                </p>
              ) : null}
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium text-[#A8B0C5] mb-1 block">
                Compare-at (₦, optional)
              </label>
              <input
                type="number"
                min={0}
                value={compareAtNaira}
                onChange={(e) => setCompareAtNaira(e.target.value ? Number(e.target.value) : '')}
                className="w-full rounded-xl border-2 border-[#D4AF37]/20 bg-[#0F2140] text-[#F5F7FA] p-3 focus:border-[#D4AF37] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-[#A8B0C5] mb-1 block">Stock quantity</label>
            <input
              type="number"
              required
              min={0}
              value={stock}
              onChange={(e) => setStock(e.target.value ? Number(e.target.value) : '')}
              className="w-full rounded-xl border-2 border-[#D4AF37]/20 bg-[#0F2140] text-[#F5F7FA] p-3 focus:border-[#D4AF37] outline-none"
            />
          </div>

          <label className="block">
            <span className="text-sm font-medium text-[#A8B0C5] mb-1 block">Product photo</span>
            <input type="file" accept="image/*" onChange={handleImageChange} className="w-full text-sm" />
          </label>

          {imagePreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imagePreview} alt="Preview" className="w-full rounded-xl max-h-64 object-cover" />
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

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
