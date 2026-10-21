'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Bell, BellOff, BellRing } from 'lucide-react';

export function RealtimeAlertsListener() {
  const router = useRouter();
  const supabase = createClient();
  const [hasNewAlert, setHasNewAlert] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
    } catch {
      // Permission prompt closed or declined
    }
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('security-alerts-live')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'security_alerts',
        },
        (payload: any) => {
          setHasNewAlert(true);
          router.refresh();

          // Push browser notification for critical alert detection
          if (
            payload.eventType === 'INSERT' &&
            payload.new?.severity === 'critical' &&
            typeof window !== 'undefined' &&
            'Notification' in window &&
            Notification.permission === 'granted'
          ) {
            const alertTypeFormatted = (payload.new.alert_type || 'critical incident')
              .replace(/_/g, ' ')
              .toUpperCase();
            const email = payload.new.details?.email || 'Unknown account';

            const notification = new Notification(`CRITICAL SECURITY ALERT: ${alertTypeFormatted}`, {
              body: `Target account: ${email}. Click to review and resolve immediately.`,
              icon: '/favicon.ico',
              tag: `alert-${payload.new.id}`,
            });

            notification.onclick = () => {
              window.focus();
              const target = document.getElementById(`alert-${payload.new.id}`);
              if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
                target.classList.add('ring-2', 'ring-red-500');
                setTimeout(() => target.classList.remove('ring-2', 'ring-red-500'), 4000);
              } else {
                window.location.hash = `alert-${payload.new.id}`;
              }
              notification.close();
            };
          }

          setTimeout(() => setHasNewAlert(false), 4000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, router]);

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#D4AF37]">
        <span className="relative flex h-2 w-2">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D4AF37] opacity-75 ${
              hasNewAlert ? 'duration-500' : 'duration-1000'
            }`}
          />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D4AF37]" />
        </span>
        <span>{hasNewAlert ? 'Alerts updated live' : 'Live updates active'}</span>
      </div>

      {typeof window !== 'undefined' && 'Notification' in window && (
        <button
          onClick={requestPermission}
          disabled={notificationPermission === 'granted'}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold transition border ${
            notificationPermission === 'granted'
              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
              : notificationPermission === 'denied'
              ? 'bg-red-950/30 text-red-300 border-red-500/30 cursor-not-allowed'
              : 'bg-[#142850] text-[#D4AF37] border-[#D4AF37]/35 hover:bg-[#D4AF37]/20'
          }`}
          title={
            notificationPermission === 'granted'
              ? 'Browser push notifications active for critical alerts'
              : notificationPermission === 'denied'
              ? 'Notifications blocked in browser settings'
              : 'Click to enable browser notifications for critical alerts'
          }
        >
          {notificationPermission === 'granted' ? (
            <>
              <BellRing className="w-3 h-3 text-emerald-400" />
              <span>Critical Alerts On</span>
            </>
          ) : notificationPermission === 'denied' ? (
            <>
              <BellOff className="w-3 h-3 text-red-400" />
              <span>Alerts Blocked</span>
            </>
          ) : (
            <>
              <Bell className="w-3 h-3 text-[#D4AF37]" />
              <span>Enable Browser Alerts</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
