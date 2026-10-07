'use client';

import { useState } from 'react';
import { AlertTriangle, Clock, User, CheckSquare, Square } from 'lucide-react';
import { AlertActions } from './AlertActions';
import { AlertTimeline, TimelineEvent } from './AlertTimeline';
import { BatchAlertActions } from './BatchAlertActions';

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'bg-red-500/15 text-red-300 border-red-500/40',
  high: 'bg-orange-500/15 text-orange-300 border-orange-500/40',
  medium: 'bg-[#D4AF37]/15 text-[#F5C445] border-[#D4AF37]/40',
  low: 'bg-[#142850] text-[#A8B0C5] border-[#D4AF37]/20',
};

export function SecurityAlertsClientView({
  alerts,
  profileMap,
  resetsByUser,
}: {
  alerts: any[];
  profileMap: Record<string, { email: string; role: string }>;
  resetsByUser: Record<string, any[]>;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const allAlertIds = alerts.map((a) => a.id);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedIds(allAlertIds);
  const clearSelection = () => setSelectedIds([]);

  if (alerts.length === 0) {
    return (
      <div className="rounded-2xl bg-[#0F2140] border border-[#D4AF37]/25 p-8 text-center">
        <p className="text-sm text-[#8A94B0]">No security alerts found matching your criteria.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Batch Actions Bar */}
      <BatchAlertActions
        allAlertIds={allAlertIds}
        selectedIds={selectedIds}
        onSelectAll={selectAll}
        onClearSelection={clearSelection}
      />

      {alerts.map((alert) => {
        const profile = alert.user_id ? profileMap[alert.user_id] : null;
        const resets = alert.user_id ? resetsByUser[alert.user_id] ?? [] : [];
        const ackAdmin = alert.acknowledged_by ? profileMap[alert.acknowledged_by] : null;
        const resAdmin = alert.resolved_by ? profileMap[alert.resolved_by] : null;
        const isSelected = selectedIds.includes(alert.id);

        const alertCreatedEvent: TimelineEvent = {
          id: `alert_created_${alert.id}`,
          timestamp: alert.created_at,
          type: 'alert_created',
          title: `${alert.alert_type.replace(/_/g, ' ')} Flagged`,
          description: 'Automated surveillance triggered this security alert',
        };

        const recoveryEvents: TimelineEvent[] = resets.map((r: any) => ({
          id: `pin_recovery_${r.id}`,
          timestamp: r.created_at,
          type: 'pin_recovery',
          title: `PIN Recovery Request (${r.role})`,
          description: `Failed attempts: ${r.failed_otp_attempts}/3 · Fee: ${r.payment_status} · Status: ${r.completed_at ? 'Completed' : r.used_at ? 'Used' : 'Active'}`,
        }));

        const acknowledgedEvent: TimelineEvent | null = alert.acknowledged_at
          ? {
              id: `ack_${alert.id}`,
              timestamp: alert.acknowledged_at,
              type: 'acknowledged',
              title: 'Acknowledged by Admin',
              description: `Reviewed by ${ackAdmin?.email ?? 'System Administrator'}`,
            }
          : null;

        const resolvedEvent: TimelineEvent | null = alert.resolved_at
          ? {
              id: `res_${alert.id}`,
              timestamp: alert.resolved_at,
              type: 'resolved',
              title: 'Marked Resolved',
              description: `Resolution recorded by ${resAdmin?.email ?? 'System Administrator'}`,
            }
          : null;

        return (
          <div
            key={alert.id}
            id={`alert-${alert.id}`}
            className={`rounded-2xl bg-[#0F2140] border transition p-4 sm:p-5 space-y-3 shadow-md ${
              isSelected ? 'border-[#D4AF37] ring-1 ring-[#D4AF37]/50' : 'border-[#D4AF37]/25'
            }`}
          >
            {/* Header: Checkbox Selection + Severity Tag + Title */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => toggleSelect(alert.id)}
                  className="text-[#D4AF37] hover:opacity-80 transition shrink-0"
                  title={isSelected ? 'Deselect alert' : 'Select alert for batch action'}
                >
                  {isSelected ? (
                    <CheckSquare className="w-4 h-4 text-[#D4AF37]" />
                  ) : (
                    <Square className="w-4 h-4 text-[#8A94B0]" />
                  )}
                </button>

                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                    SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.low
                  }`}
                >
                  <AlertTriangle className="w-3 h-3" />
                  {alert.severity}
                </span>
                <span className="text-xs font-bold text-white capitalize">
                  {alert.alert_type.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-[#8A94B0]">
                <Clock className="w-3 h-3 text-[#D4AF37]" />
                <span>{new Date(alert.created_at).toLocaleString('en-NG')}</span>
              </div>
            </div>

            {/* Account Context */}
            <div className="rounded-xl bg-[#0B1528] border border-white/10 p-3 text-xs space-y-1.5">
              <div className="flex justify-between gap-4">
                <span className="text-[#A8B0C5] flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#D4AF37]" /> Target Account:
                </span>
                <span className="font-medium text-white break-all">
                  {profile?.email || alert.details?.email || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-[#A8B0C5]">Role:</span>
                <span className="capitalize font-semibold text-[#D4AF37]">
                  {profile?.role ?? 'unknown'}
                </span>
              </div>
            </div>

            {/* Per-Alert Timeline with Date-Range Filter */}
            <AlertTimeline
              alertCreatedEvent={alertCreatedEvent}
              recoveryEvents={recoveryEvents}
              acknowledgedEvent={acknowledgedEvent}
              resolvedEvent={resolvedEvent}
            />

            {/* Individual Acknowledge / Resolve Actions */}
            <AlertActions
              alertId={alert.id}
              acknowledged={Boolean(alert.acknowledged_at)}
              resolved={Boolean(alert.resolved)}
            />
          </div>
        );
      })}
    </div>
  );
}
