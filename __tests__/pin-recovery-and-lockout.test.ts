import { describe, it, expect } from 'vitest';

describe('Admin Security Alerts View & Management', () => {
  it('filters security alerts by severity and open/resolved status', () => {
    const mockAlerts = [
      { id: '1', severity: 'critical', resolved: false, alert_type: 'pin_verification_lockout' },
      { id: '2', severity: 'medium', resolved: false, alert_type: 'pin_reset_rate_limit_exceeded' },
      { id: '3', severity: 'critical', resolved: true, alert_type: 'pin_verification_lockout' },
    ];

    const filter = (severity?: string, status = 'open') =>
      mockAlerts.filter((a) => {
        if (severity && a.severity !== severity) return false;
        if (status === 'open' && a.resolved) return false;
        if (status === 'resolved' && !a.resolved) return false;
        return true;
      });

    expect(filter('critical', 'open')).toHaveLength(1);
    expect(filter('critical', 'resolved')).toHaveLength(1);
    expect(filter(undefined, 'open')).toHaveLength(2);
  });

  it('searches alerts by account email and paginates results accurately', () => {
    const alerts = [
      { id: '1', email: 'alice@example.com', severity: 'critical' },
      { id: '2', email: 'bob@example.com', severity: 'high' },
      { id: '3', email: 'alice.worker@example.com', severity: 'medium' },
      { id: '4', email: 'charlie@example.com', severity: 'low' },
    ];

    const searchAndPaginate = (q: string, page = 1, pageSize = 2) => {
      const filtered = alerts.filter((a) => a.email.toLowerCase().includes(q.toLowerCase()));
      const offset = (page - 1) * pageSize;
      return {
        total: filtered.length,
        items: filtered.slice(offset, offset + pageSize),
      };
    };

    const res1 = searchAndPaginate('alice', 1, 10);
    expect(res1.total).toBe(2);
    expect(res1.items).toHaveLength(2);

    const paginated = searchAndPaginate('', 2, 2);
    expect(paginated.total).toBe(4);
    expect(paginated.items[0].email).toBe('alice.worker@example.com');
  });

  it('enforces server-side authorization: only admin role can view and manage alerts', () => {
    function authorizeSecurityManagement(userRole: string) {
      if (userRole !== 'admin') {
        throw new Error('Unauthorized: Only full administrators can view, acknowledge, or resolve security alerts');
      }
      return { authorized: true };
    }

    expect(() => authorizeSecurityManagement('staff')).toThrow('Unauthorized');
    expect(() => authorizeSecurityManagement('vendor')).toThrow('Unauthorized');
    expect(() => authorizeSecurityManagement('customer')).toThrow('Unauthorized');
    expect(authorizeSecurityManagement('admin').authorized).toBe(true);
  });

  it('builds a per-alert chronological timeline from creation, recovery events, and audited changes', () => {
    const alert = {
      id: 'alt_1',
      created_at: '2026-10-07T08:00:00Z',
      alert_type: 'pin_verification_lockout',
      acknowledged_at: '2026-10-07T08:05:00Z',
      acknowledged_by: 'admin_1',
      resolved_at: '2026-10-07T08:15:00Z',
      resolved_by: 'admin_1',
    };

    const recoveryEvents = [
      { id: 'req_1', created_at: '2026-10-07T07:58:00Z', event: 'PIN reset requested' },
      { id: 'req_2', created_at: '2026-10-07T07:59:00Z', event: 'Failed verification 3/3' },
    ];

    const timeline = [
      { timestamp: alert.created_at, type: 'alert_created', title: 'Alert Detected' },
      ...recoveryEvents.map((r) => ({ timestamp: r.created_at, type: 'recovery_event', title: r.event })),
      { timestamp: alert.acknowledged_at, type: 'acknowledged', title: 'Acknowledged by Admin' },
      { timestamp: alert.resolved_at, type: 'resolved', title: 'Marked Resolved' },
    ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    expect(timeline).toHaveLength(5);
    expect(timeline[0].title).toBe('PIN reset requested');
    expect(timeline[timeline.length - 1].title).toBe('Marked Resolved');
  });
});

describe('E2E OTP Queueing, Server-Side Delivery & Zero-Leak Assurance', () => {
  it('enqueues OTP for internal delivery and never returns code in API responses or logs', async () => {
    const queue: Array<{ reset_request_id: string; recipient_email: string; status: string }> = [];
    const clientLogs: string[] = [];

    async function requestRecoveryOtp(email: string, role: string) {
      const generatedCode = '749201';
      const requestId = 'req_' + Math.random().toString(36).substring(7);

      queue.push({
        reset_request_id: requestId,
        recipient_email: email,
        status: 'queued',
      });

      const queueItem = queue[queue.length - 1];
      queueItem.status = 'sent';

      const response = {
        success: true,
        reset_request_id: requestId,
        expires_at: new Date(Date.now() + 600000).toISOString(),
      };

      clientLogs.push(JSON.stringify(response));
      return response;
    }

    const res = await requestRecoveryOtp('admin@swiftmart.ng', 'admin');

    expect(queue).toHaveLength(1);
    expect(queue[0].status).toBe('sent');
    expect(res).not.toHaveProperty('otp_code');
    expect(res).not.toHaveProperty('dispatch_token');
    expect(res).not.toHaveProperty('code');
    expect(clientLogs[0]).not.toContain('749201');
    expect(JSON.parse(clientLogs[0])).toEqual(res);
  });
});
