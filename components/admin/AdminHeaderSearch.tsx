'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Store, Package, ShoppingBag, X } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface SearchResults {
  vendors: { id: string; name: string; business_name?: string }[];
  products: { id: string; title: string; price_kobo: number }[];
  orders: { id: string; order_number: string; total_kobo: number; status: string }[];
}

export function AdminHeaderSearch() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResults>({ vendors: [], products: [], orders: [] });
  const containerRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults({ vendors: [], products: [], orders: [] });
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      const cleanQ = query.trim();

      const [vRes, pRes, oRes] = await Promise.all([
        supabase
          .from('vendors')
          .select('id, name, business_name')
          .or(`name.ilike.%${cleanQ}%,business_name.ilike.%${cleanQ}%`)
          .limit(5),
        supabase
          .from('products')
          .select('id, title, price_kobo')
          .ilike('title', `%${cleanQ}%`)
          .limit(5),
        supabase
          .from('orders')
          .select('id, order_number, total_kobo, status')
          .ilike('order_number', `%${cleanQ}%`)
          .limit(5),
      ]);

      setResults({
        vendors: vRes.data ?? [],
        products: pRes.data ?? [],
        orders: oRes.data ?? [],
      });
      setLoading(false);
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const hasResults =
    results.vendors.length > 0 || results.products.length > 0 || results.orders.length > 0;

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2 bg-[#0F2550] border border-[#D4AF37]/30 px-3 py-1.5 rounded-xl text-xs text-[#A8B0C5] focus-within:border-[#D4AF37] focus-within:ring-1 focus-within:ring-[#D4AF37]/40 transition">
        <Search className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search vendors, products, orders..."
          className="bg-transparent border-none outline-none text-[#F5F7FA] placeholder-[#8A94B0] w-40 sm:w-64 text-xs"
        />
        {loading && <Loader2 className="w-3 h-3 text-[#D4AF37] animate-spin shrink-0" />}
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setIsOpen(false);
            }}
            className="text-[#8A94B0] hover:text-[#F5F7FA]"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {isOpen && query.length >= 2 && (
        <div className="absolute right-0 mt-2 w-72 sm:w-96 bg-[#0D1D3A] border border-[#D4AF37]/35 rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.6)] p-3 z-50 max-h-[80vh] overflow-y-auto divide-y divide-[#D4AF37]/15">
          {loading && !hasResults && (
            <div className="p-4 text-center text-xs text-[#A8B0C5]">Searching live records...</div>
          )}

          {!loading && !hasResults && (
            <div className="p-4 text-center text-xs text-[#A8B0C5]">
              No matches found for &quot;{query}&quot;
            </div>
          )}

          {results.vendors.length > 0 && (
            <div className="pb-2">
              <span className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-wider px-2 block mb-1">
                Vendors ({results.vendors.length})
              </span>
              <div className="space-y-1">
                {results.vendors.map((v) => (
                  <Link
                    key={v.id}
                    href={`/admin/vendors/${v.id}`}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-[#142850] transition text-left"
                  >
                    <Store className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-[#F5F7FA] truncate">
                        {v.business_name || v.name}
                      </p>
                      <p className="text-[10px] text-[#A8B0C5] truncate">Vendor ID: {v.id.slice(0, 8)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {results.products.length > 0 && (
            <div className="py-2">
              <span className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-wider px-2 block mb-1">
                Products ({results.products.length})
              </span>
              <div className="space-y-1">
                {results.products.map((p) => (
                  <Link
                    key={p.id}
                    href={`/admin/products`}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-[#142850] transition text-left"
                  >
                    <Package className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                    <div className="overflow-hidden flex-1">
                      <p className="text-xs font-bold text-[#F5F7FA] truncate">{p.title}</p>
                      <p className="text-[10px] text-[#D4AF37]">
                        ₦{(p.price_kobo / 100).toLocaleString('en-NG')}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {results.orders.length > 0 && (
            <div className="pt-2">
              <span className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-wider px-2 block mb-1">
                Orders ({results.orders.length})
              </span>
              <div className="space-y-1">
                {results.orders.map((o) => (
                  <Link
                    key={o.id}
                    href={`/admin/orders`}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-[#142850] transition text-left"
                  >
                    <ShoppingBag className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                    <div className="overflow-hidden flex-1">
                      <p className="text-xs font-bold text-[#F5F7FA] truncate">
                        Order #{o.order_number}
                      </p>
                      <p className="text-[10px] text-[#A8B0C5]">
                        ₦{(o.total_kobo / 100).toLocaleString('en-NG')} ·{' '}
                        <span className="text-[#E8C874] capitalize">{o.status}</span>
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
