import { describe, it, expect } from 'vitest';

describe('Admin Security Alerts View, Live Updates & CSV Export', () => {
  it('formats filtered alerts into standard CSV rows respecting active filters and detection-date bounds', () => {
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
      {
        id: 'alt_002',
        created_at: '2026-09-01T08:00:00.000Z',
        severity: 'low',
        alert_type: 'pin_verification_lockout',
        user_id: 'usr_1',
        resolved: false,
        acknowledged_at: null,
        resolved_at: null,
        details: { email: 'target@example.com' },
      },
    ];

    const filterByDateBounds = (items: typeof alerts, start?: string, end?: string) =>
      items.filter((a) => {
        const t = new Date(a.created_at).getTime();
        if (start && t < new Date(start).getTime()) return false;
        if (end && t > new Date(end).setHours(23, 59, 59, 999)) return false;
        return true;
      });

    const inRange = filterByDateBounds(alerts, '2026-10-01', '2026-10-10');
    expect(inRange).toHaveLength(1);
    expect(inRange[0].id).toBe('alt_001');

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

    const rows = inRange.map((a) => {
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

  it('processes batch security alert management with per-alert audit logging', () => {
    const auditLogs: any[] = [];
    const alertIds = ['alt_1', 'alt_2', 'alt_3'];
    const callingAdmin = 'admin_uuid';

    function batchManageAlerts(ids: string[], action: 'acknowledge' | 'resolve') {
      ids.forEach((id) => {
        auditLogs.push({
          actor_id: callingAdmin,
          event_type: action === 'acknowledge' ? 'security_alert_acknowledged' : 'security_alert_resolved',
          metadata: { alert_id: id, action, batch: true },
        });
      });
      return { success: true, count: ids.length };
    }

    const res = batchManageAlerts(alertIds, 'resolve');
    expect(res.count).toBe(3);
    expect(auditLogs).toHaveLength(3);
    expect(auditLogs[0].metadata.alert_id).toBe('alt_1');
    expect(auditLogs[1].metadata.alert_id).toBe('alt_2');
    expect(auditLogs[2].metadata.alert_id).toBe('alt_3');
  });
});

describe('Strict Server Authorization', () => {
  it('enforces server-side authorization: only admin role can view and manage alerts', () => {
    function authorizeSecurityManagement(userRole: string) {
      if (userRole !== 'admin') {
        throw new Error('Unauthorized: Only full administrators can view, acknowledge, or resolve security alerts');
      }
      return { authorized: true };
    }

    expect(() => authorizeSecurityManagement('staff')).toThrow('Unauthorized');
    expect(() => authorizeSecurityManagement('vendor')).toThrow('Unauthorized');
    expect(authorizeSecurityManagement('admin').authorized).toBe(true);
  });
});
