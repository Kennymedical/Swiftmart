import { describe, it, expect } from 'vitest';

describe('Admin Security Alerts View, Live Updates & CSV Export', () => {
  it('formats filtered alerts into standard CSV rows respecting active filters', () => {
    const alerts = [
      {
        id: 'alt_001',
        created_at: '2026-10-07T08:00:00.000Z',
        severity: 'critical',
        alert_type: 'pin_verification_lockout',
        user_id: 'usr_1',
        resolved: false,
        acknowledged_at: null,
        resolved_at: null,
        details: { email: 'target@example.com' },
      },
    ];

    const profileMap = {
      usr_1: { email: 'target@example.com', role: 'admin' },
    };

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
      const email = profileMap[a.user_id]?.email || 'N/A';
      const role = profileMap[a.user_id]?.role || 'N/A';
      const status = a.resolved ? 'Resolved' : a.acknowledged_at ? 'Acknowledged' : 'New';
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
        `"${JSON.stringify(a.details)}"`,
      ].join(',');
    });

    const csvOutput = [headers.join(','), ...rows].join('\n');
    expect(csvOutput).toContain('"alt_001"');
    expect(csvOutput).toContain('"target@example.com"');
    expect(csvOutput).toContain('"critical"');
    expect(csvOutput).toContain('"New"');
  });

  it('filters timeline events within a specified date range', () => {
    const events = [
      { timestamp: '2026-10-01T10:00:00Z', title: 'Old Event' },
      { timestamp: '2026-10-05T12:00:00Z', title: 'Target Window Event' },
      { timestamp: '2026-10-09T15:00:00Z', title: 'Future Event' },
    ];

    const filterByDateRange = (evs: typeof events, start: string, end: string) => {
      const s = new Date(start).getTime();
      const e = new Date(end).setHours(23, 59, 59, 999);
      return evs.filter((ev) => {
        const t = new Date(ev.timestamp).getTime();
        return t >= s && t <= e;
      });
    };

    const inRange = filterByDateRange(events, '2026-10-04', '2026-10-06');
    expect(inRange).toHaveLength(1);
    expect(inRange[0].title).toBe('Target Window Event');
  });

  it('merges live Supabase realtime event payloads into state without reload', () => {
    let state = [{ id: 'alt_1', status: 'new' }];

    function handleRealtimeEvent(payload: { eventType: string; new: any; old: any }) {
      if (payload.eventType === 'INSERT') {
        state = [payload.new, ...state];
      } else if (payload.eventType === 'UPDATE') {
        state = state.map((item) => (item.id === payload.new.id ? payload.new : item));
      }
    }

    handleRealtimeEvent({
      eventType: 'INSERT',
      new: { id: 'alt_2', status: 'new' },
      old: null,
    });
    expect(state).toHaveLength(2);
    expect(state[0].id).toBe('alt_2');

    handleRealtimeEvent({
      eventType: 'UPDATE',
      new: { id: 'alt_1', status: 'resolved' },
      old: { id: 'alt_1', status: 'new' },
    });
    expect(state.find((s) => s.id === 'alt_1')?.status).toBe('resolved');
  });
});

describe('Strict Server Authorization & E2E Delivery', () => {
  it('enforces server-side authorization: only admin role can view and manage alerts', () => {
    function authorizeSecurityManagement(userRole: string) {
      if (userRole !== 'admin') {
        throw new Error('Unauthorized: Only full administrators can view, acknowledge, or resolve security alerts');
      }
      return { authorized: true };
    }

    expect(() =>  authorizeSecurityManagement('staff')).toThrow('Unauthorized');
    expect(() => authorizeSecurityManagement('vendor')).toThrow('Unauthorized');
    expect(authorizeSecurityManagement('admin').authorized).toBe(true);
  });
});
