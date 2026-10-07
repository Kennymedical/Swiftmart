'use client';

import { Download } from 'lucide-react';

export function ExportCSVButton({
  alerts,
  profileMap,
  filters,
}: {
  alerts: any[];
  profileMap: Record<string, { email: string; role: string }>;
  filters: { severity?: string; status?: string; q?: string };
}) {
  const handleExport = () => {
    if (!alerts || alerts.length === 0) return;

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

    const rows = alerts.map((a) => {
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
    link.setAttribute('href', url);
    link.setAttribute('download', `security-alerts_${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleExport}
      disabled={!alerts || alerts.length === 0}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-[#142850] text-[#D4AF37] border border-[#D4AF37]/35 hover:bg-[#D4AF37]/20 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
      title="Export currently filtered alerts to CSV"
    >
      <Download className="w-3.5 h-3.5 text-[#D4AF37]" />
      <span>Export CSV</span>
    </button>
  );
}
