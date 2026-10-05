'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Percent, Shield, Store, Check, AlertCircle, Save, Plus } from 'lucide-react';

interface VendorItem {
  id: string;
  business_name: string;
  commission_rate: number | null;
  status: string;
}

export default function AdminCommissionsPage() {
  const supabase = createClient();
  const [globalRate, setGlobalRate] = useState<number>(10);
  const [vendors, setVendors] = useState<VendorItem[]>([]);
  const [search, setSearch] = useState('');
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const [vendorRateInput, setVendorRateInput] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [savingGlobal, setSavingGlobal] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    // Fetch global setting
    const { data: setting } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'global_commission_rate')
      .maybeSingle();

    if (setting?.value && typeof setting.value === 'object' && 'rate_percent' in setting.value) {
      setGlobalRate(Number((setting.value as { rate_percent: number }).rate_percent) || 10);
    }

    // Fetch vendors
    const { data: vendorList } = await supabase
      .from('vendors')
      .select('id, business_name, commission_rate, status')
      .order('business_name', { ascending: true });

    if (vendorList) {
      setVendors(vendorList);
    }
    setLoading(false);
  }

  async function handleSaveGlobal() {
    setSavingGlobal(true);
    setMessage(null);
    const { error } = await supabase.from('platform_settings').upsert({
      key: 'global_commission_rate',
      value: { rate_percent: globalRate },
      updated_at: new Date().toISOString(),
    });

    setSavingGlobal(false);
    if (error) {
      setMessage({ text: 'Failed to update global commission: ' + error.message, type: 'error' });
    } else {
      setMessage({ text: `Global platform commission updated to ${globalRate}% successfully!`, type: 'success' });
    }
  }

  async function handleSaveVendorRate(vendorId: string) {
    const rateNum = parseFloat(vendorRateInput);
    if (isNaN(rateNum) || rateNum < 0 || rateNum > 100) {
      setMessage({ text: 'Please enter a valid percentage between 0 and 100.', type: 'error' });
      return;
    }

    const { error } = await supabase
      .from('vendors')
      .update({ commission_rate: rateNum })
      .eq('id', vendorId);

    if (error) {
      setMessage({ text: 'Failed to update vendor commission: ' + error.message, type: 'error' });
    } else {
      setVendors((prev) =>
        prev.map((v) => (v.id === vendorId ? { ...v, commission_rate: rateNum } : v))
      );
      setEditingVendorId(null);
      setMessage({ text: 'Vendor custom commission rate updated successfully!', type: 'success' });
    }
  }

  const filteredVendors = vendors.filter((v) =>
    v.business_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#D4AF37] tracking-tight">
          Commission & Fee Governance
        </h1>
        <p className="text-sm text-[#A8B0C5] mt-1">
          Configure universal platform sales fees, custom vendor commission tiers, and future marketplace incentives.
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 border text-sm ${
            message.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : 'bg-red-950/40 border-red-500/40 text-red-300'
          }`}
        >
          {message.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Global Platform Commission Card */}
      <div className="bg-gradient-to-br from-[#142850] to-[#1B2F5E] border border-[#D4AF37]/30 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-[#0F2140] border border-[#D4AF37]/40 text-[#D4AF37]">
            <Percent size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#F5F7FA]">Global Baseline Commission</h2>
            <p className="text-xs text-[#A8B0C5]">Universal platform rate applied to all vendors unless an override exists.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-2">
          <div className="relative w-full sm:w-64">
            <input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={globalRate}
              onChange={(e) => setGlobalRate(parseFloat(e.target.value) || 0)}
              className="w-full bg-[#0F2140] border-2 border-[#D4AF37]/40 rounded-xl px-4 py-3 text-lg font-bold text-[#F5EAC2] focus:border-[#D4AF37] outline-none"
            />
            <span className="absolute right-4 top-3.5 text-lg font-bold text-[#D4AF37]">%</span>
          </div>

          <button
            onClick={handleSaveGlobal}
            disabled={savingGlobal}
            className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-[#F2D57E] to-[#D4A937] text-[#0A1931] font-extrabold rounded-xl hover:opacity-90 transition flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
          >
            <Save size={18} />
            <span>{savingGlobal ? 'Saving...' : 'Update Universal Rate'}</span>
          </button>
        </div>
      </div>

      {/* Per-Vendor Custom Override Table */}
      <div className="bg-gradient-to-br from-[#142850] to-[#1B2F5E] border border-[#D4AF37]/30 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#F5F7FA]">Vendor-Specific Custom Rates</h2>
            <p className="text-xs text-[#A8B0C5]">Adjust commission rate individually for specific merchants or VIP partners.</p>
          </div>
          <input
            type="text"
            placeholder="Search vendor store..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64 bg-[#0F2140] border border-[#D4AF37]/30 rounded-xl px-3 py-2 text-xs text-[#F5F7FA] focus:border-[#D4AF37] outline-none"
          />
        </div>

        <div className="overflow-x-auto rounded-2xl border border-[#D4AF37]/20">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0A1931] text-[#D4AF37] uppercase tracking-wider font-bold border-b border-[#D4AF37]/20">
              <tr>
                <th className="py-3 px-4">Vendor Store</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Current Commission</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 bg-[#0F2140]/60">
              {filteredVendors.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-[#A8B0C5]">
                    {loading ? 'Loading merchants...' : 'No vendors found.'}
                  </td>
                </tr>
              ) : (
                filteredVendors.map((vendor) => {
                  const isEditing = editingVendorId === vendor.id;
                  const currentRate = vendor.commission_rate ?? globalRate;

                  return (
                    <tr key={vendor.id} className="hover:bg-white/[0.02] transition">
                      <td className="py-3 px-4 font-semibold text-[#F5F7FA]">
                        {vendor.business_name}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            vendor.status === 'approved'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {vendor.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.5"
                              value={vendorRateInput}
                              onChange={(e) => setVendorRateInput(e.target.value)}
                              className="w-20 bg-[#0A1931] border border-[#D4AF37] rounded-lg px-2 py-1 text-xs text-white"
                            />
                            <span className="text-[#D4AF37] font-bold">%</span>
                          </div>
                        ) : (
                          <span className="font-bold text-[#F5C445]">
                            {currentRate}% {vendor.commission_rate !== null ? '(Custom)' : '(Default)'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleSaveVendorRate(vendor.id)}
                              className="px-3 py-1 bg-[#D4AF37] text-[#0A1931] font-bold rounded-lg hover:opacity-90 transition"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingVendorId(null)}
                              className="px-2 py-1 text-[#A8B0C5] hover:text-white transition"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingVendorId(vendor.id);
                              setVendorRateInput(String(currentRate));
                            }}
                            className="px-3 py-1 border border-[#D4AF37]/40 text-[#D4AF37] font-semibold rounded-lg hover:bg-[#142850] transition"
                          >
                            Edit Rate
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
