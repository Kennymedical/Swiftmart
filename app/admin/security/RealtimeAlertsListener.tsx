'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Radio } from 'lucide-react';

export function RealtimeAlertsListener() {
  const router = useRouter();
  const supabase = createClient();
  const [hasNewAlert, setHasNewAlert] = useState(false);

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
        (payload) => {
          setHasNewAlert(true);
          router.refresh();
          setTimeout(() => setHasNewAlert(false), 4000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, router]);

  return (
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
  );
}
