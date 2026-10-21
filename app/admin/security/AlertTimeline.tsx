'use client';

import { useState, useMemo } from 'react';
import { History, Calendar, KeyRound, Eye, CheckCircle2, AlertTriangle, Info, Lock } from 'lucide-react';

export interface TimelineEvent {
  id: string;
  timestamp: string;
  type: 'alert_created' | 'pin_recovery' | 'acknowledged' | 'resolved';
  title: string;
  description: string;
}

export function AlertTimeline({
  alertCreatedEvent,
  recoveryEvents,
  acknowledgedEvent,
  resolvedEvent,
}: {
  alertCreatedEvent: TimelineEvent;
  recoveryEvents: TimelineEvent[];
  acknowledgedEvent: TimelineEvent | null;
  resolvedEvent: TimelineEvent | null;
}) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const allEvents: TimelineEvent[] = useMemo(() => {
    const list: TimelineEvent[] = [alertCreatedEvent, ...recoveryEvents];
    if (acknowledgedEvent) list.push(acknowledgedEvent);
    if (resolvedEvent) list.push(resolvedEvent);
    return list.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [alertCreatedEvent, recoveryEvents, acknowledgedEvent, resolvedEvent]);

  const filteredEvents = useMemo(() => {
    return allEvents.filter((ev) => {
      const time = new Date(ev.timestamp).getTime();
      if (startDate) {
        const start = new Date(startDate).getTime();
        if (time < start) return false;
      }
      if (endDate) {
        // Set to end of day if only date is picked
        const end = new Date(endDate).setHours(23, 59, 59, 999);
        if (time > end) return false;
      }
      return true;
    });
  }, [allEvents, startDate, endDate]);

  return (
    <div className="space-y-3 pt-2 border-t border-[#D4AF37]/15">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#D4AF37] flex items-center gap-1.5">
          <History className="w-3.5 h-3.5" /> Incident & Resolution Timeline
        </h4>

        {/* Date-Range Filter Inputs */}
        <div className="flex items-center gap-1.5 text-[11px]">
          <Calendar className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-[#0A152B] border border-[#D4AF37]/30 text-white rounded-lg px-2 py-1 text-[11px] focus:outline-none focus:border-[#D4AF37]"
            title="Start date"
          />
          <span className="text-[#8A94B0]">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-[#0A152B] border border-[#D4AF37]/30 text-white rounded-lg px-2 py-1 text-[11px] focus:outline-none focus:border-[#D4AF37]"
            title="End date"
          />
          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="px-2 py-0.5 rounded text-[10px] text-[#A8B0C5] hover:text-white bg-white/5"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {filteredEvents.length === 0 ? (
        <p className="text-xs text-[#8A94B0] italic py-2">
          No activity recorded in the selected date range.
        </p>
      ) : (
        <div className="relative pl-5 space-y-3 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#D4AF37]/30">
          {filteredEvents.map((ev) => {
            const isCreated = ev.type === 'alert_created';
            const isResolved = ev.type === 'resolved';
            const isAck = ev.type === 'acknowledged';

            let dotColor = 'bg-[#D4AF37]';
            if (isCreated) dotColor = 'bg-red-400';
            else if (isResolved) dotColor = 'bg-emerald-400';
            else if (isAck) dotColor = 'bg-[#E8C874]';

            return (
              <div key={ev.id} className="relative text-xs">
                <div
                  className={`absolute -left-5 top-0.5 w-2.5 h-2.5 rounded-full ${dotColor} border border-[#0F2140]`}
                />
                <div className="flex items-center justify-between text-[#F5F7FA]">
                  <span
                    className={`font-semibold flex items-center gap-1 ${
                      isResolved
                        ? 'text-emerald-300'
                        : isAck
                        ? 'text-[#E8C874]'
                        : isCreated
                        ? 'text-red-300'
                        : 'text-[#F5F7FA]'
                    }`}
                  >
                    {isCreated && <AlertTriangle className="w-3 h-3 text-red-400" />}
                    {isAck && <Eye className="w-3 h-3 text-[#E8C874]" />}
                    {isResolved && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                    {ev.type === 'pin_recovery' && (
                      <KeyRound className="w-3 h-3 text-[#D4AF37]" />
                    )}
                    {ev.title}
                  </span>
                  <span className="text-[10px] text-[#8A94B0]">
                    {new Date(ev.timestamp).toLocaleString('en-NG', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-[11px] text-[#A8B0C5] mt-0.5">{ev.description}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
