'use client';

import { useState } from 'react';
import { TrendingUp, Users, DollarSign, Calendar } from 'lucide-react';

interface DayData {
  date: string;
  liabilityKobo: number;
  vendorApprovals: number;
  payoutKobo: number;
}

interface TrendChartsProps {
  trendData: DayData[];
  totalLiabilityKobo: number;
  totalPayoutsKobo: number;
  totalNewVendors: number;
}

export function AdminTrendCharts({
  trendData,
  totalLiabilityKobo,
  totalPayoutsKobo,
  totalNewVendors,
}: TrendChartsProps) {
  const [range, setRange] = useState<'7d' | '30d'>('7d');
  const [activeMetric, setActiveMetric] = useState<'liability' | 'vendors' | 'payouts'>('liability');

  const sliceCount = range === '7d' ? 7 : 30;
  const data = trendData.slice(-sliceCount);

  // Compute maximum values for scaling
  const maxLiability = Math.max(1, ...data.map((d) => d.liabilityKobo));
  const maxVendors = Math.max(1, ...data.map((d) => d.vendorApprovals));
  const maxPayouts = Math.max(1, ...data.map((d) => d.payoutKobo));

  const formatNaira = (kobo: number) =>
    `₦${(kobo / 100).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;

  return (
    <div className="bg-gradient-to-br from-[#142850] to-[#1B2F5E] border border-[#D4AF37]/25 rounded-2xl p-5 sm:p-6 shadow-[0_4px_25px_rgba(212,175,55,0.08)] space-y-5">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#0F2140] border border-[#D4AF37]/30 text-[#D4AF37]">
              <TrendingUp className="w-4 h-4" />
            </span>
            <h3 className="text-base font-bold text-[#F5F7FA]">Platform Trend Analytics</h3>
          </div>
          <p className="text-xs text-[#A8B0C5] mt-1">
            Real-time multi-day trend tracking from live Supabase ledger events.
          </p>
        </div>

        {/* Date Range Selector */}
        <div className="flex items-center gap-1.5 bg-[#0A1931] p-1 rounded-xl border border-[#D4AF37]/20 self-start sm:self-auto">
          <button
            onClick={() => setRange('7d')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
              range === '7d'
                ? 'bg-[#142850] text-[#D4AF37] border border-[#D4AF37]/30'
                : 'text-[#8A94B0] hover:text-[#F5F7FA]'
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setRange('30d')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
              range === '30d'
                ? 'bg-[#142850] text-[#D4AF37] border border-[#D4AF37]/30'
                : 'text-[#8A94B0] hover:text-[#F5F7FA]'
            }`}
          >
            Last 30 Days
          </button>
        </div>
      </div>

      {/* Metric Selector Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => setActiveMetric('liability')}
          className={`p-3 rounded-xl border text-left transition ${
            activeMetric === 'liability'
              ? 'bg-[#0F2550] border-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.15)]'
              : 'bg-[#0A1931]/60 border-[#D4AF37]/20 hover:border-[#D4AF37]/40'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-[#A8B0C5] mb-1">
            <span>Wallet Liability</span>
            <DollarSign className="w-3.5 h-3.5 text-[#D4AF37]" />
          </div>
          <p className="text-lg font-black text-[#D4AF37]">{formatNaira(totalLiabilityKobo)}</p>
          <p className="text-[10px] text-[#2ED573] mt-0.5">Live platform balances</p>
        </button>

        <button
          onClick={() => setActiveMetric('vendors')}
          className={`p-3 rounded-xl border text-left transition ${
            activeMetric === 'vendors'
              ? 'bg-[#0F2550] border-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.15)]'
              : 'bg-[#0A1931]/60 border-[#D4AF37]/20 hover:border-[#D4AF37]/40'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-[#A8B0C5] mb-1">
            <span>Vendor Approvals</span>
            <Users className="w-3.5 h-3.5 text-[#E8C874]" />
          </div>
          <p className="text-lg font-black text-[#E8C874]">{totalNewVendors} Vendors</p>
          <p className="text-[10px] text-[#A8B0C5] mt-0.5">Approved in period</p>
        </button>

        <button
          onClick={() => setActiveMetric('payouts')}
          className={`p-3 rounded-xl border text-left transition ${
            activeMetric === 'payouts'
              ? 'bg-[#0F2550] border-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.15)]'
              : 'bg-[#0A1931]/60 border-[#D4AF37]/20 hover:border-[#D4AF37]/40'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-[#A8B0C5] mb-1">
            <span>Payout Volume</span>
            <Calendar className="w-3.5 h-3.5 text-[#F5C445]" />
          </div>
          <p className="text-lg font-black text-[#F5C445]">{formatNaira(totalPayoutsKobo)}</p>
          <p className="text-[10px] text-[#A8B0C5] mt-0.5">Disbursed to bank accounts</p>
        </button>
      </div>

      {/* Responsive Visual Bar Chart */}
      <div className="pt-4 border-t border-[#D4AF37]/15">
        <div className="h-44 flex items-end gap-1.5 sm:gap-2 px-1">
          {data.map((item, idx) => {
            let heightPercent = 10;
            let valLabel = '';

            if (activeMetric === 'liability') {
              heightPercent = Math.max(12, Math.round((item.liabilityKobo / maxLiability) * 100));
              valLabel = formatNaira(item.liabilityKobo);
            } else if (activeMetric === 'vendors') {
              heightPercent = maxVendors === 0 ? 10 : Math.max(12, Math.round((item.vendorApprovals / maxVendors) * 100));
              valLabel = `${item.vendorApprovals} v`;
            } else {
              heightPercent = maxPayouts === 0 ? 10 : Math.max(12, Math.round((item.payoutKobo / maxPayouts) * 100));
              valLabel = formatNaira(item.payoutKobo);
            }

            return (
              <div
                key={idx}
                className="flex-1 flex flex-col items-center justify-end h-full group relative"
              >
                {/* Tooltip on hover */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-2 bg-[#0A1931] border border-[#D4AF37]/40 px-2.5 py-1 rounded-lg text-[10px] whitespace-nowrap text-[#D4AF37] z-20 pointer-events-none shadow-lg">
                  <p className="font-bold">{item.date}</p>
                  <p className="text-[#F5F7FA]">{valLabel}</p>
                </div>

                {/* Animated visual bar */}
                <div
                  style={{ height: `${heightPercent}%` }}
                  className={`w-full rounded-t-md transition-all duration-300 ${
                    activeMetric === 'liability'
                      ? 'bg-gradient-to-t from-[#142850] to-[#D4AF37] group-hover:to-[#F5C445]'
                      : activeMetric === 'vendors'
                      ? 'bg-gradient-to-t from-[#142850] to-[#E8C874] group-hover:to-[#FFF]'
                      : 'bg-gradient-to-t from-[#142850] to-[#F5C445] group-hover:to-[#2ED573]'
                  }`}
                />

                {/* Date label */}
                <span className="text-[9px] sm:text-[10px] text-[#8A94B0] mt-2 truncate w-full text-center">
                  {item.date.slice(5)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
