'use client';

import { useState } from 'react';
import { NotificationItem } from '@/components/NotificationItem';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'order_update', label: 'Orders' },
  { key: 'wallet', label: 'Wallet' },
  { key: 'system', label: 'Updates' },
];

export function NotificationsList({ notifications }: { notifications: Notification[] }) {
  const [activeTab, setActiveTab] = useState('all');

  const filtered = notifications.filter((n) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'wallet') return n.type === 'wallet_credit' || n.type === 'wallet_debit';
    return n.type === activeTab;
  });

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto px-4 py-3 bg-[#0F172A] border-b border-[#D4AF37]/20 scrollbar-none">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`whitespace-nowrap text-xs font-bold px-3.5 py-1.5 rounded-full transition ${
              activeTab === tab.key
                ? 'bg-[#D4AF37] text-[#0A1028] shadow'
                : 'bg-[#151B3D] text-slate-300 hover:text-white border border-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-[#D4AF37]/70 py-16 text-sm">No notifications here.</p>
      ) : (
        <div className="bg-[#0A1028] divide-y divide-[#D4AF37]/15">
          {filtered.map((n) => (
            <NotificationItem
              key={n.id}
              id={n.id}
              title={n.title}
              body={n.body}
              link={n.link}
              readAt={n.read_at}
              createdAt={n.created_at}
            />
          ))}
        </div>
      )}
    </div>
  );
   }
    
