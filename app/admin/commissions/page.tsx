'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Percent, Search, Plus, History } from 'lucide-react';

interface VendorItem {
  id: string;
  business_name: string;
  commission_rate: number | null;
}

interface AuditLog {
  id: string;
  target_name: string;
  previous_rate: number;
  new_rate: number;
  created_at: string;
  reason?: string;
}

interface CustomCommission {
  id: string;
  name: string;
  scope: string;
  fee_type: string;
  fee_value: number;
  effective_date: string;
  status: string;
  notification_sent: boolean;
}

export default function AdminCommissionsPage() {
  const supabase = createClient();

  const [globalRate, setGlobalRate] = useState<number>(10.0);
  const [markupRate, setMarkupRate] = useState<number>(20.0);
  const [transferFee, setTransferFee] = useState<number>(50.0);
  const [withdrawalFee, setWithdrawalFee] = useState<number>(100.0);

  const [vendors, setVendors] = useState<VendorItem[]>([]);
  const [vendorSearch, setVendorSearch] = useState('');
  const [customRates, setCustomRates] = useState<Record<string, string>>({});

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [customCommissions, setCustomCommissions] = useState<CustomCommission[]>([]);

  const [newFeeName, setNewFeeName] = useState('');
  const [newFeeScope, setNewFeeScope] = useState('global');
  const [newFeeType, setNewFeeType] = useState('percent');
  const [newFeeValue, setNewFeeValue] = useState('');
  const [newFeeDate, setNewFeeDate] = useState('');
  const [notifyUsersAhead, setNotifyUsersAhead] = useState(true);

  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const { data: settings } = await supabase.from('platform_settings').select('*');
    if (settings) {
      settings.forEach((s) => {
        if (s.key === 'global_commission_rate') setGlobalRate(s.value?.rate_percent ?? 10.0);
        if (s.key === 'markup_rate') setMarkupRate(s.value?.rate_percent ?? 20.0);
        if (s.key === 'transfer_fee') setTransferFee(s.value?.amount_naira ?? 50.0);
        if (s.key === 'withdrawal_fee') setWithdrawalFee(s.value?.amount_naira ?? 100.0);
      });
    }

    const { data: vList } = await supabase
      .from('vendors')
      .select('id, business_name, commission_rate')
      .order('business_name');
    if (vList) {
      setVendors(vList);
      const ratesMap: Record<string, string> = {};
      vList.forEach((v) => {
        ratesMap[v.id] = v.commission_rate != null ? String(v.commission_rate) : '';
      });
      setCustomRates(ratesMap);
    }

    const { data: logs } = await supabase
      .from('commission_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    if (logs) setAuditLogs(logs);

    const { data: customFees } = await supabase
      .from('custom_commissions')
      .select('*')
      .order('effective_date', { ascending: false });
    if (customFees) setCustomCommissions(customFees);
  }

  async function handleUpdateCoreRate(key: string, name: string, oldValue: number, newValue: number, payload: any) {
    setSavingKey(key);
    setStatusMessage(null);
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('platform_settings').upsert({
      key,
      value: payload,
      updated_at: new Date().toISOString(),
    });

    await supabase.from('commission_audit_logs').insert({
      changed_by: user?.id,
      target_type: key,
      target_name: name,
      previous_rate: oldValue,
      new_rate: newValue,
      reason: 'Admin dashboard update',
    });

    setStatusMessage(`${name} successfully updated to ${newValue}!`);
    setSavingKey(null);
    fetchData();
  }

  async function handleSaveVendorRate(vendorId: string, vendorName: string, oldRate: number | null) {
    setSavingKey(vendorId);
    setStatusMessage(null);
    const val = customRates[vendorId]?.trim();
    const parsedRate = val === '' ? null : parseFloat(val);
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('vendors').update({ commission_rate: parsedRate }).eq('id', vendorId);

    await supabase.from('commission_audit_logs').insert({
      changed_by: user?.id,
      target_type: 'vendor_override',
      target_name: vendorName,
      previous_rate: oldRate,
      new_rate: parsedRate ?? globalRate,
      reason: parsedRate === null ? 'Reset to global default' : 'Custom vendor commission',
    });

    setStatusMessage(`Updated custom rate for ${vendorName}`);
    setSavingKey(null);
    fetchData();
  }

  async function handleCreateCustomCommission(e: React.FormEvent) {
    e.preventDefault();
    setSavingKey('new_custom_commission');
    const { data: { user } } = await supabase.auth.getUser();
    const feeVal = parseFloat(newFeeValue);

    const { error } = await supabase.from('custom_commissions').insert({
      name: newFeeName.trim(),
      scope: newFeeScope,
      fee_type: newFeeType,
      fee_value: feeVal,
      effective_date: new Date(newFeeDate).toISOString(),
      created_by: user?.id,
      notification_sent: notifyUsersAhead,
    });

    if (error) {
      alert('Error creating commission: ' + error.message);
      setSavingKey(null);
      return;
    }

    if (notifyUsersAhead) {
      const { data: allUsers } = await supabase.from('profiles').select('id');
      if (allUsers && allUsers.length > 0) {
        const notifs = allUsers.map((u) => ({
          user_id: u.id,
          title: `Upcoming Policy Update: ${newFeeName}`,
          message: `Please be advised that ${newFeeName} (${newFeeType === 'percent' ? feeVal + '%' : '₦' + feeVal}) will go live on ${new Date(newFeeDate).toLocaleDateString()}.`,
          link: '/notifications',
          type: 'info',
        }));
        await supabase.from('notifications').insert(notifs);
      }
    }

    setNewFeeName('');
    setNewFeeValue('');
    setNewFeeDate('');
    setStatusMessage('New commission created and scheduled! Users notified ahead.');
    setSavingKey(null);
    fetchData();
  }

  const filteredVendors = vendors.filter((v) =>
    v.business_name.toLowerCase().includes(vendorSearch.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-black text-[#D4AF37] uppercase tracking-wider flex items-center gap-2">
          <Percent className="w-6 h-6" /> Commission & Fee Governance
        </h1>
        <p className="text-xs text-[#A8B0C5] mt-1">
          Centrally control platform markup, sales commission, withdrawal fees, and custom scheduled rates.
        </p>
      </div>

      {statusMessage && (
        <div className="p-3 bg-[#142850] border border-[#2ED573]/50 text-[#2ED573] text-xs font-bold rounded-xl">
          ✓ {statusMessage}
        </div>
      )}

      {/* Universal Platform Fees */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-b from-[#142850] to-[#0A1931] border border-[#D4AF37]/30 rounded-2xl p-5 shadow-lg">
          <span className="text-[10px] uppercase font-bold text-[#D4AF37] tracking-wider">Vendor Sales Cut</span>
          <h3 className="text-lg font-bold text-white mt-1">Marketplace Commission</h3>
          <p className="text-[11px] text-[#A8B0C5] mt-1 mb-3">Deducted from vendor sales upon order completion.</p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.1"
              value={globalRate}
              onChange={(e) => setGlobalRate(parseFloat(e.target.value) || 0)}
              className="w-24 rounded-xl border border-[#D4AF37]/40 bg-[#0A1931] text-white p-2 text-sm font-bold text-center outline-none focus:border-[#D4AF37]"
            />
            <span className="text-sm font-bold text-[#D4AF37]">%</span>
            <button
              onClick={() => handleUpdateCoreRate('global_commission_rate', 'Marketplace Commission', 10, globalRate, { rate_percent: globalRate })}
              disabled={savingKey === 'global_commission_rate'}
              className="ml-auto px-3 py-1.5 bg-[#D4AF37] text-[#0A1931] font-bold text-xs rounded-xl hover:opacity-90 disabled:opacity-50"
            >
              {savingKey === 'global_commission_rate' ? 'Saving...' : 'Update'}
            </button>
          </div>
        </div>

        <div className="bg-gradient-to-b from-[#142850] to-[#0A1931] border border-[#D4AF37]/30 rounded-2xl p-5 shadow-lg">
          <span className="text-[10px] uppercase font-bold text-[#D4AF37] tracking-wider">Shopper Price Added</span>
          <h3 className="text-lg font-bold text-white mt-1">Platform Markup</h3>
          <p className="text-[11px] text-[#A8B0C5] mt-1 mb-3">Added automatically to vendor price on storefront.</p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.1"
              value={markupRate}
              onChange={(e) => setMarkupRate(parseFloat(e.target.value) || 0)}
              className="w-24 rounded-xl border border-[#D4AF37]/40 bg-[#0A1931] text-white p-2 text-sm font-bold text-center outline-none focus:border-[#D4AF37]"
            />
            <span className="text-sm font-bold text-[#D4AF37]">%</span>
            <button
              onClick={() => handleUpdateCoreRate('markup_rate', 'Platform Markup', 20, markupRate, { rate_percent: markupRate })}
              disabled={savingKey === 'markup_rate'}
              className="ml-auto px-3 py-1.5 bg-[#D4AF37] text-[#0A1931] font-bold text-xs rounded-xl hover:opacity-90 disabled:opacity-50"
            >
              {savingKey === 'markup_rate' ? 'Saving...' : 'Update'}
            </button>
          </div>
        </div>

        <div className="bg-gradient-to-b from-[#142850] to-[#0A1931] border border-[#D4AF37]/30 rounded-2xl p-5 shadow-lg">
          <span className="text-[10px] uppercase font-bold text-[#D4AF37] tracking-wider">Internal Transfer</span>
          <h3 className="text-lg font-bold text-white mt-1">P2P Wallet Fee</h3>
          <p className="text-[11px] text-[#A8B0C5] mt-1 mb-3">Flat fee charged per peer-to-peer wallet transfer.</p>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[#D4AF37]">₦</span>
            <input
              type="number"
              value={transferFee}
              onChange={(e) => setTransferFee(parseFloat(e.target.value) || 0)}
              className="w-24 rounded-xl border border-[#D4AF37]/40 bg-[#0A1931] text-white p-2 text-sm font-bold text-center outline-none focus:border-[#D4AF37]"
            />
            <button
              onClick={() => handleUpdateCoreRate('transfer_fee', 'P2P Wallet Fee', 50, transferFee, { amount_naira: transferFee })}
              disabled={savingKey === 'transfer_fee'}
              className="ml-auto px-3 py-1.5 bg-[#D4AF37] text-[#0A1931] font-bold text-xs rounded-xl hover:opacity-90 disabled:opacity-50"
            >
              {savingKey === 'transfer_fee' ? 'Saving...' : 'Update'}
            </button>
          </div>
        </div>

        <div className="bg-gradient-to-b from-[#142850] to-[#0A1931] border border-[#D4AF37]/30 rounded-2xl p-5 shadow-lg">
          <span className="text-[10px] uppercase font-bold text-[#D4AF37] tracking-wider">Bank Payout</span>
          <h3 className="text-lg font-bold text-white mt-1">Withdrawal Fee</h3>
          <p className="text-[11px] text-[#A8B0C5] mt-1 mb-3">Charge per bank settlement payout transfer.</p>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[#D4AF37]">₦</span>
            <input
              type="number"
              value={withdrawalFee}
              onChange={(e) => setWithdrawalFee(parseFloat(e.target.value) || 0)}
              className="w-24 rounded-xl border border-[#D4AF37]/40 bg-[#0A1931] text-white p-2 text-sm font-bold text-center outline-none focus:border-[#D4AF37]"
            />
            <button
              onClick={() => handleUpdateCoreRate('withdrawal_fee', 'Withdrawal Fee', 100, withdrawalFee, { amount_naira: withdrawalFee })}
              disabled={savingKey === 'withdrawal_fee'}
              className="ml-auto px-3 py-1.5 bg-[#D4AF37] text-[#0A1931] font-bold text-xs rounded-xl hover:opacity-90 disabled:opacity-50"
            >
              {savingKey === 'withdrawal_fee' ? 'Saving...' : 'Update'}
            </button>
          </div>
        </div>
      </div>

      {/* Schedule Custom Commission Form */}
      <div className="bg-gradient-to-b from-[#142850] to-[#0A1931] border border-[#D4AF37]/30 rounded-2xl p-6 shadow-xl">
        <h2 className="text-base font-bold text-[#D4AF37] mb-2 flex items-center gap-2">
          <Plus size={18} /> Schedule Custom Commission or Fee Rule
        </h2>
        <p className="text-xs text-[#A8B0C5] mb-5">
          Create new fee types that take effect automatically on a set go-live date, with early notifications sent to merchants and shoppers.
        </p>

        <form onSubmit={handleCreateCustomCommission} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-semibold text-[#A8B0C5] mb-1 block">Rule / Fee Name</label>
            <input
              type="text"
              required
              value={newFeeName}
              onChange={(e) => setNewFeeName(e.target.value)}
              placeholder="e.g. Q4 Logistics Surcharge"
              className="w-full rounded-xl border border-[#D4AF37]/30 bg-[#0A1931] text-white p-2.5 text-xs outline-none focus:border-[#D4AF37]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#A8B0C5] mb-1 block">Fee Type & Value</label>
            <div className="flex gap-2">
              <select
                value={newFeeType}
                onChange={(e) => setNewFeeType(e.target.value)}
                className="rounded-xl border border-[#D4AF37]/30 bg-[#0A1931] text-white p-2.5 text-xs outline-none"
              >
                <option value="percent">% Percent</option>
                <option value="flat_naira">₦ Flat (NGN)</option>
              </select>
              <input
                type="number"
                step="0.01"
                required
                value={newFeeValue}
                onChange={(e) => setNewFeeValue(e.target.value)}
                placeholder="Rate"
                className="w-full rounded-xl border border-[#D4AF37]/30 bg-[#0A1931] text-white p-2.5 text-xs outline-none focus:border-[#D4AF37]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#A8B0C5] mb-1 block">Effective Go-Live Date</label>
            <input
              type="date"
              required
              value={newFeeDate}
              onChange={(e) => setNewFeeDate(e.target.value)}
              className="w-full rounded-xl border border-[#D4AF37]/30 bg-[#0A1931] text-white p-2.5 text-xs outline-none focus:border-[#D4AF37]"
            />
          </div>

          <div className="flex flex-col justify-end">
            <label className="flex items-center gap-2 text-xs text-[#A8B0C5] mb-2 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyUsersAhead}
                onChange={(e) => setNotifyUsersAhead(e.target.checked)}
                className="rounded text-[#D4AF37]"
              />
              Notify all users ahead
            </label>
            <button
              type="submit"
              disabled={savingKey === 'new_custom_commission'}
              className="w-full py-2.5 bg-gradient-to-r from-[#F2D57E] to-[#D4A937] text-[#0A1931] font-black rounded-xl text-xs hover:opacity-90 disabled:opacity-50"
            >
              {savingKey === 'new_custom_commission' ? 'Scheduling...' : 'Schedule & Notify'}
            </button>
          </div>
        </form>

        {customCommissions.length > 0 && (
          <div className="mt-6 border-t border-white/10 pt-4">
            <h3 className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider mb-3">Scheduled Fee Rules</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {customCommissions.map((c) => (
                <div key={c.id} className="p-3 rounded-xl bg-[#0B1528] border border-white/10 text-xs space-y-1">
                  <div className="flex justify-between font-bold text-white">
                    <span>{c.name}</span>
                    <span className="text-[#D4AF37]">{c.fee_type === 'percent' ? `${c.fee_value}%` : `₦${c.fee_value}`}</span>
                  </div>
                  <div className="text-[11px] text-[#A8B0C5] flex items-center justify-between">
                    <span>Go-Live: {new Date(c.effective_date).toLocaleDateString()}</span>
                    <span className="text-[#2ED573]">Notified</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Individual Merchant Overrides */}
      <div className="bg-gradient-to-b from-[#142850] to-[#0A1931] border border-[#D4AF37]/30 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-base font-bold text-[#D4AF37]">Individual Merchant Overrides</h2>
            <p className="text-xs text-[#A8B0C5]">Assign merchant-specific commission discounts or surcharges.</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#A8B0C5]" />
            <input
              type="text"
              placeholder="Search store name..."
              value={vendorSearch}
              onChange={(e) => setVendorSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[#0A1931] border border-[#D4AF37]/30 text-white placeholder-white/30 outline-none focus:border-[#D4AF37]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#D4AF37]/20 text-[#A8B0C5] uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Merchant / Store</th>
                <th className="py-2.5 px-3">Active Rate</th>
                <th className="py-2.5 px-3">Custom Rate (%)</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredVendors.map((v) => (
                <tr key={v.id} className="hover:bg-white/[0.02]">
                  <td className="py-3 px-3 font-semibold text-white">{v.business_name}</td>
                  <td className="py-3 px-3">
                    {v.commission_rate != null ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30">
                        {v.commission_rate}% (Custom)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/5 text-[#A8B0C5]">
                        {globalRate}% (Default)
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <input
                      type="number"
                      step="0.1"
                      placeholder={`Default (${globalRate}%)`}
                      value={customRates[v.id] ?? ''}
                      onChange={(e) => setCustomRates({ ...customRates, [v.id]: e.target.value })}
                      className="w-32 rounded-lg border border-[#D4AF37]/30 bg-[#0A1931] text-white p-1.5 text-xs outline-none focus:border-[#D4AF37]"
                    />
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => handleSaveVendorRate(v.id, v.business_name, v.commission_rate)}
                      disabled={savingKey === v.id}
                      className="px-3 py-1 bg-[#142850] text-[#D4AF37] border border-[#D4AF37]/40 rounded-lg hover:bg-[#D4AF37] hover:text-[#0A1931] font-bold text-xs transition disabled:opacity-50"
                    >
                      {savingKey === v.id ? 'Saving...' : 'Apply'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Real-time Commission Audit Log */}
      <div className="bg-gradient-to-b from-[#142850] to-[#0A1931] border border-[#D4AF37]/30 rounded-2xl p-6 shadow-xl">
        <h2 className="text-base font-bold text-[#D4AF37] mb-1 flex items-center gap-2">
          <History size={18} /> Commission & Fee Change Audit Trail
        </h2>
        <p className="text-xs text-[#A8B0C5] mb-4">
          Immutable log recording every fee adjustment, actor, previous value, and effective timestamp.
        </p>

        {auditLogs.length === 0 ? (
          <p className="text-xs text-[#A8B0C5]">No rate changes recorded in this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#D4AF37]/20 text-[#A8B0C5] uppercase text-[10px] tracking-wider">
                  <th className="py-2 px-3">Timestamp</th>
                  <th className="py-2 px-3">Target Rate / Merchant</th>
                  <th className="py-2 px-3">Previous</th>
                  <th className="py-2 px-3">New Value</th>
                  <th className="py-2 px-3">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02]">
                    <td className="py-2.5 px-3 text-[#A8B0C5]">{new Date(log.created_at).toLocaleString()}</td>
                    <td className="py-2.5 px-3 font-semibold text-white">{log.target_name}</td>
                    <td className="py-2.5 px-3 text-red-400 font-mono">{log.previous_rate != null ? log.previous_rate : '—'}</td>
                    <td className="py-2.5 px-3 text-[#2ED573] font-bold font-mono">{log.new_rate}</td>
                    <td className="py-2.5 px-3 text-[#A8B0C5]">{log.reason || 'Admin Adjustment'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
