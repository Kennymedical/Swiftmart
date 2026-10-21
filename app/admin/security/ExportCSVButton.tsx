'use client';

import { useState } from 'react';
import { Download, Calendar, Filter } from 'lucide-react';

export function ExportCSVButton({
  alerts,
  profileMap,
  filters,
}: {
  alerts: any[];
  profileMap: Record<string, { email: string; role: string }>;
  filters: { severity?: string; status?: string; q?: string };
}) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleExport = () => {
    if (!alerts || alerts.length === 0) return;

    // Filter alerts by detection date bounds while preserving active email, severity, and status filters
    const filtered = alerts.filter((a) => {
      const detectedTime = new Date(a.created_at).getTime();
      if (startDate) {
        const start = new Date(startDate).getTime();
        if (detectedTime < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate).setHours(23, 59, 59, 999);
        if (detectedTime > end) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      alert('No alerts match the selected detection date bounds.');
      return;
    }

    const headers = [
      'Alert ID',
      'Detected At',
      'Severity',
      'Alert Type',
      'Account Email',
      'Account Role',
      'Status',
      'Acknowledged At',
      'Resolved At',
      'Details',
    ];

    const rows = filtered.map((a) => {
      const profile = a.user_id ? profileMap[a.user_id] : null;
      const email = profile?.email || a.details?.email || 'N/A';
      const role = profile?.role || 'N/A';
      const status = a.resolved ? 'Resolved' : a.acknowledged_at ? 'Acknowledged' : 'New';
      const details = JSON.stringify(a.details || {}).replace(/"/g, '""');

      return [
        `"${a.id}"`,
        `"${new Date(a.created_at).toISOString()}"`,
        `"${a.severity}"`,
        `"${a.alert_type}"`,
        `"${email}"`,
        `"${role}"`,
        `"${status}"`,
        `"${a.acknowledged_at || ''}"`,
        `"${a.resolved_at || ''}"`,
        `"${details}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dateTag = startDate || endDate ? `_${startDate || 'start'}_to_${endDate || 'end'}` : '';
    link.setAttribute('href', url);
    link.setAttribute('download', `security-alerts${dateTag}_${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowDatePicker(false);
  };

  return (
    <div className="relative inline-block">
      <div className="flex items-center gap-1">
        <button
          onClick={handleExport}
          disabled={!alerts || alerts.length === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-l-xl bg-[#142850] text-[#D4AF37] border border-[#D4AF37]/35 hover:bg-[#D4AF37]/20 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          title="Export currently filtered alerts to CSV"
        >
          <Download className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span>Export CSV</span>
        </button>

        <button
          onClick={() => setShowDatePicker(!showDatePicker)}
          className={`px-2 py-1.5 text-xs rounded-r-xl border border-l-0 border-[#D4AF37]/35 transition ${
            startDate || endDate
              ? 'bg-[#D4AF37] text-[#0A152B] font-bold'
              : 'bg-[#142850] text-[#D4AF37] hover:bg-[#D4AF37]/20'
          }`}
          title="Filter CSV export by detection date bounds"
        >
          <Calendar className="w-3.5 h-3.5" />
        </button>
      </div>

      {showDatePicker && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-[#0A152B] border border-[#D4AF37]/40 rounded-xl p-3 shadow-2xl z-50 text-xs space-y-2">
          <div className="flex items-center justify-between border-b border-[#D4AF37]/15 pb-1.5">
            <span className="font-bold text-[#D4AF37] flex items-center gap-1">
              <Filter className="w-3 h-3" /> Detection Date Bounds
            </span>
            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                className="text-[10px] text-[#A8B0C5] hover:text-white"
              >
                Clear
              </button>
            )}
          </div>

          <div className="space-y-1.5">
            <div>
              <label className="text-[10px] text-[#8A94B0] block mb-0.5">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-[#0F2140] border border-[#D4AF37]/30 text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#8A94B0] block mb-0.5">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-[#0F2140] border border-[#D4AF37]/30 text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
          </div>

          <button
            onClick={handleExport}
            className="w-full py-1.5 mt-2 rounded-lg bg-[#D4AF37] text-[#0A152B] font-bold text-xs hover:bg-[#E8C874] transition"
          >
            Download Date-Bounded CSV
          </button>
        </div>
      )}
    </div>
  );
}
