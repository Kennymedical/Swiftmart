'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface Result {
  id: string;
  business_name: string;
  status: string;
  username: string | null;
}

export function VendorSearch() {
  const supabase = createClient();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [searching, setSearching] = useState(false);

  async function handleSearch() {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    setSearching(true);

    // Match by vendor id (exact), business name (partial), or the
    // owner's username (partial) — whichever finds something.
    const [byId, byName, byUsername] = await Promise.all([
      supabase.from('vendors').select('id, business_name, status, user_id').eq('id', q),
      supabase.from('vendors').select('id, business_name, status, user_id').ilike('business_name', `%${q}%`),
      supabase.from('profiles').select('id, username').ilike('username', `%${q}%`),
    ]);

    let vendorRows = [...(byId.data ?? []), ...(byName.data ?? [])];

    if (byUsername.data && byUsername.data.length > 0) {
      const userIds = byUsername.data.map((p) => p.id);
      const { data: byOwner } = await supabase
        .from('vendors')
        .select('id, business_name, status, user_id')
        .in('user_id', userIds);
      vendorRows = [...vendorRows, ...(byOwner ?? [])];
    }

    const uniqueVendors = Array.from(new Map(vendorRows.map((v) => [v.id, v])).values());

    const ownerIds = uniqueVendors.map((v) => v.user_id);
    const { data: owners } = ownerIds.length
      ? await supabase.from('profiles').select('id, username').in('id', ownerIds)
      : { data: [] };
    const ownerMap = new Map((owners ?? []).map((o) => [o.id, o.username]));

    setResults(
      uniqueVendors.map((v) => ({
        id: v.id,
        business_name: v.business_name,
        status: v.status,
        username: ownerMap.get(v.user_id) ?? null,
      })),
    );
    setSearching(false);
  }

  return (
    <div className="p-4 bg-[#0A1931] border-b border-[#D4AF37]/20 text-[#F5F7FA]">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search by username, business name, or vendor ID"
          className="flex-1 rounded-xl border-2 border-[#D4AF37]/20 bg-[#0F2140] text-[#F5F7FA] p-2.5 text-sm focus:border-[#D4AF37] outline-none"
        />
        <button
          onClick={handleSearch}
          disabled={searching}
          className="bg-[#0F172A] text-[#D4AF37] text-sm font-semibold px-4 rounded-xl border border-[#D4AF37] disabled:opacity-50"
        >
          {searching ? '...' : 'Search'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="mt-3 space-y-2">
          {results.map((r) => (
            <button
              key={r.id}
              onClick={() => router.push(`/admin/vendors/${r.id}`)}
              className="w-full text-left bg-[#142850] rounded-xl p-3 hover:bg-[#1B2F5E] border border-[#D4AF37]/20 text-[#F5F7FA]"
            >
              <p className="text-sm font-semibold text-[#0F172A]">{r.business_name}</p>
              <p className="text-xs text-[#A8B0C5]">
                @{r.username ?? 'unknown'} · <span className="capitalize">{r.status}</span>
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
  
