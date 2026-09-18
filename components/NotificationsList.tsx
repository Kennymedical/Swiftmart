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
      <div className="flex gap-2 overflow-x-auto px-4 py-3 bg-white border-b border-gray-100">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`whitespace-nowrap text-xs font-semibold px-3 py-1.5 rounded-full ${
              activeTab === tab.key
                ? 'bg-[#0F172A] text-[#D4AF37]'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-gray-500 py-16">No notifications here.</p>
      ) : (
        <div className="bg-white">
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
    
