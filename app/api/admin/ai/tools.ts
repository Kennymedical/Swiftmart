import { SupabaseClient } from '@supabase/supabase-js';

export const toolDeclarations = [
  {
    name: 'get_platform_overview',
    description: 'Full health check — user counts, sales, treasury, active issues. Use for "how is the platform", "overview", "summary", "how are we doing".',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_sales_analytics',
    description: 'Sales analytics with period comparison and trends.',
    parameters: {
      type: 'object',
      properties: {
        period: { type: 'string', enum: ['today', 'week', 'month', 'quarter', 'all'] },
        compare_to_previous: { type: 'boolean' },
      },
    },
  },
  {
    name: 'find_anomalies',
    description: 'Scan for unusual activity — large orders, rapid transactions, stuck orders. Use when asked "anything weird", "anything suspicious", "anything I should worry about".',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'list_users',
    description: 'List users with role and status.',
    parameters: {
      type: 'object',
      properties: {
        role: { type: 'string', enum: ['all', 'admin', 'staff', 'vendor', 'buyer'] },
        search: { type: 'string' },
        limit: { type: 'integer' },
      },
    },
  },
  {
    name: 'get_user_details',
    description: 'Full details about a specific user — profile, wallet, recent orders.',
    parameters: { type: 'object', properties: { user_id: { type: 'string' } }, required: ['user_id'] },
  },
  {
    name: 'list_vendors',
    description: 'List vendors with status, rating, KYC, commission.',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'pending, active, suspended, all' },
        sort: { type: 'string', enum: ['newest', 'top_rated'] },
        limit: { type: 'integer' },
      },
    },
  },
  {
    name: 'get_vendor_performance',
    description: 'Deep dive on a vendor — sales, top products, payout totals.',
    parameters: { type: 'object', properties: { vendor_id: { type: 'string' } }, required: ['vendor_id'] },
  },
  {
    name: 'list_products',
    description: 'List products with filters and sorting.',
    parameters: {
      type: 'object',
      properties: {
        sort: { type: 'string', enum: ['best_sellers', 'newest', 'low_stock', 'highest_rated'] },
        status: { type: 'string' },
        limit: { type: 'integer' },
      },
    },
  },
  {
    name: 'get_low_stock_alerts',
    description: 'Products running low on stock that need restocking.',
    parameters: { type: 'object', properties: { threshold: { type: 'integer' } } },
  },
  {
    name: 'list_orders',
    description: 'List orders with status, amount, timeline.',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        customer_id: { type: 'string' },
        limit: { type: 'integer' },
      },
    },
  },
  {
    name: 'get_order_details',
    description: 'Full order details — items, vendor, customer, payment.',
    parameters: { type: 'object', properties: { order_id: { type: 'string' } }, required: ['order_id'] },
  },
  {
    name: 'get_stuck_orders',
    description: 'Orders appearing stuck — paid but not delivered, or in a state too long.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_treasury_status',
    description: 'Platform treasury balance, revenue breakdown, recent movements.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_wallet_liability',
    description: 'Total wallet balances across all users — money the platform holds for users.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'list_transactions',
    description: 'Recent wallet transactions — deposits, withdrawals, transfers, refunds.',
    parameters: {
      type: 'object',
      properties: { type: { type: 'string' }, limit: { type: 'integer' } },
    },
  },
  {
    name: 'get_commission_report',
    description: 'Commission earned, rate changes, audit trail.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'list_disputes',
    description: 'Disputes with reason, status, evidence.',
    parameters: {
      type: 'object',
      properties: { status: { type: 'string', enum: ['all', 'open', 'resolved'] } },
    },
  },
  {
    name: 'get_dispute_details',
    description: 'Full dispute info — order, customer, vendor, evidence, notes.',
    parameters: { type: 'object', properties: { dispute_id: { type: 'string' } }, required: ['dispute_id'] },
  },
  {
    name: 'get_social_stats',
    description: 'Posts, comments, likes, follows, engagement metrics.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_security_alerts',
    description: 'PIN locks, failed attempts, suspicious account activity.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_growth_opportunities',
    description: 'Analyze data for growth — underperforming vendors, overstocked products, category gaps.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'approve_vendor',
    description: 'Approve a pending vendor. ONLY after user explicitly confirms.',
    parameters: { type: 'object', properties: { vendor_id: { type: 'string' } }, required: ['vendor_id'] },
  },
  {
    name: 'suspend_vendor',
    description: 'Suspend a vendor. ONLY after user explicitly confirms.',
    parameters: {
      type: 'object',
      properties: { vendor_id: { type: 'string' }, reason: { type: 'string' } },
      required: ['vendor_id', 'reason'],
    },
  },
  {
    name: 'resolve_dispute',
    description: 'Mark a dispute as resolved. ONLY after explicit confirmation.',
    parameters: {
      type: 'object',
      properties: { dispute_id: { type: 'string' }, resolution_note: { type: 'string' } },
      required: ['dispute_id', 'resolution_note'],
    },
  },
  {
    name: 'send_admin_broadcast',
    description: 'Send a notification to all vendors. ONLY after explicit confirmation.',
    parameters: {
      type: 'object',
      properties: { title: { type: 'string' }, message: { type: 'string' } },
      required: ['title', 'message'],
    },
  },
];

function periodStart(period: string) {
  const now = new Date();
  const day = 86400000;
  if (period === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  if (period === 'week') return new Date(Date.now() - 7 * day).toISOString();
  if (period === 'month') return new Date(Date.now() - 30 * day).toISOString();
  if (period === 'quarter') return new Date(Date.now() - 90 * day).toISOString();
  return null;
}

export async function executeTool(name: string, args: any, db: SupabaseClient, actorId: string): Promise<any> {
  args = args || {};
  const naira = (k: any) => (Number(k) || 0) / 100;
  switch (name) {
    case 'get_platform_overview': {
      const [u, v, p, o, t, openDisputes, pendingVendors] = await Promise.all([
        db.from('profiles').select('id', { count: 'exact', head: true }),
        db.from('vendors').select('id', { count: 'exact', head: true }),
        db.from('products').select('id', { count: 'exact', head: true }),
        db.from('orders').select('id', { count: 'exact', head: true }),
        db.from('platform_treasury').select('balance_kobo').order('updated_at', { ascending: false }).limit(1).maybeSingle(),
        db.from('disputes').select('id', { count: 'exact', head: true }).neq('status', 'resolved'),
        db.from('vendors').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);
      return {
        users: u.count || 0,
        vendors: v.count || 0,
        products: p.count || 0,
        orders: o.count || 0,
        treasury_naira: naira(t.data?.balance_kobo).toFixed(2),
        open_disputes: openDisputes.count || 0,
        pending_vendor_approvals: pendingVendors.count || 0,
      };
    }

    case 'get_sales_analytics': {
      const start = periodStart(args.period || 'month');
      let q = db.from('orders').select('total_kobo, status, created_at').order('created_at', { ascending: false });
      if (start) q = q.gte('created_at', start);
      const { data } = await q;
      const rows = data || [];
      const valid = rows.filter((r: any) => !['cancelled', 'pending_payment'].includes(r.status));
      const total = valid.reduce((s: number, r: any) => s + Number(r.total_kobo || 0), 0);
      return {
        period: args.period || 'month',
        orders: rows.length,
        completed_orders: valid.length,
        total_naira: naira(total).toFixed(2),
        average_order_naira: valid.length ? naira(total / valid.length).toFixed(2) : '0',
      };
    }

    case 'find_anomalies': {
      const day = 86400000;
      const [bigOrders, fastTx, stuckOrders] = await Promise.all([
        db.from('orders').select('order_number, total_kobo, status, created_at').gte('created_at', new Date(Date.now() - 7 * day).toISOString()).gt('total_kobo', 50000000).limit(10),
        db.from('transactions').select('amount_kobo, type, created_at').gte('created_at', new Date(Date.now() - day).toISOString()).order('created_at', { ascending: false }).limit(50),
        db.from('orders').select('order_number, status, created_at').in('status', ['pending', 'paid']).lt('created_at', new Date(Date.now() - 7 * day).toISOString()).limit(10),
      ]);
      return {
        large_orders_last_7d: bigOrders.data || [],
        recent_transactions_24h: fastTx.data?.length || 0,
        stuck_orders_over_7d: stuckOrders.data || [],
      };
    }

    case 'list_users': {
      let q = db.from('profiles').select('id, username, full_name, role, is_active, created_at');
      if (args.role && args.role !== 'all') q = q.eq('role', args.role);
      if (args.search) q = q.or(`username.ilike.%${args.search}%,full_name.ilike.%${args.search}%`);
      const { data } = await q.order('created_at', { ascending: false }).limit(args.limit || 20);
      return { count: data?.length || 0, users: data || [] };
    }

    case 'get_user_details': {
      const [profile, wallet, orders] = await Promise.all([
        db.from('profiles').select('*').eq('id', args.user_id).maybeSingle(),
        db.from('wallets').select('balance_kobo, virtual_account_number, currency').eq('user_id', args.user_id).maybeSingle(),
        db.from('orders').select('order_number, total_kobo, status, created_at').eq('customer_id', args.user_id).order('created_at', { ascending: false }).limit(10),
      ]);
      return { profile: profile.data, wallet: wallet.data, recent_orders: orders.data || [] };
    }

    case 'list_vendors': {
      let q = db.from('vendors').select('id, business_name, status, rating, review_count, commission_rate, nin_verified_by_paystack, created_at');
      if (args.status && args.status !== 'all') q = q.eq('status', args.status);
      if (args.sort === 'top_rated') q = q.order('rating', { ascending: false, nullsFirst: false });
      else q = q.order('created_at', { ascending: false });
      const { data } = await q.limit(args.limit || 20);
      return { count: data?.length || 0, vendors: data || [] };
    }

    case 'get_vendor_performance': {
      const [v, products, items] = await Promise.all([
        db.from('vendors').select('*').eq('id', args.vendor_id).maybeSingle(),
        db.from('products').select('id, name, sold_count, stock, price_kobo, rating').eq('vendor_id', args.vendor_id).order('sold_count', { ascending: false }).limit(10),
        db.from('order_items').select('line_total_kobo, vendor_payout_kobo, commission_kobo').eq('vendor_id', args.vendor_id).limit(500),
      ]);
      const rows = items.data || [];
      const sales = rows.reduce((s: number, r: any) => s + Number(r.line_total_kobo || 0), 0);
      const payout = rows.reduce((s: number, r: any) => s + Number(r.vendor_payout_kobo || 0), 0);
      return {
        vendor: v.data,
        top_products: products.data || [],
        total_sales_naira: naira(sales).toFixed(2),
        total_payout_naira: naira(payout).toFixed(2),
        items_sold: rows.length,
      };
    }
    case 'list_products': {
      const sort = args.sort || 'best_sellers';
      let q = db.from('products').select('id, name, price_kobo, stock, sold_count, rating, status');
      if (sort === 'best_sellers') q = q.order('sold_count', { ascending: false, nullsFirst: false });
      else if (sort === 'highest_rated') q = q.order('rating', { ascending: false, nullsFirst: false });
      else if (sort === 'low_stock') q = q.lt('stock', 5).order('stock', { ascending: true });
      else q = q.order('created_at', { ascending: false });
      if (args.status) q = q.eq('status', args.status);
      const { data } = await q.limit(args.limit || 15);
      return { products: data || [] };
    }

    case 'get_low_stock_alerts': {
      const { data } = await db.from('products').select('id, name, stock, sold_count').lt('stock', args.threshold || 5).order('stock', { ascending: true }).limit(20);
      return { alerts: data || [] };
    }

    case 'list_orders': {
      let q = db.from('orders').select('id, order_number, customer_id, status, total_kobo, payment_reference, created_at');
      if (args.status) q = q.eq('status', args.status);
      if (args.customer_id) q = q.eq('customer_id', args.customer_id);
      const { data } = await q.order('created_at', { ascending: false }).limit(args.limit || 20);
      return { orders: data || [] };
    }

    case 'get_order_details': {
      const [order, items] = await Promise.all([
        db.from('orders').select('*').eq('id', args.order_id).maybeSingle(),
        db.from('order_items').select('product_name, quantity, unit_price_kobo, line_total_kobo, vendor_id').eq('order_id', args.order_id),
      ]);
      return { order: order.data, items: items.data || [] };
    }

    case 'get_stuck_orders': {
      const day = 86400000;
      const { data } = await db.from('orders').select('order_number, status, total_kobo, created_at').in('status', ['pending', 'paid', 'processing']).lt('created_at', new Date(Date.now() - 7 * day).toISOString()).order('created_at', { ascending: true }).limit(20);
      return { stuck_orders: data || [] };
    }

    case 'get_treasury_status': {
      const [t, r] = await Promise.all([
        db.from('platform_treasury').select('balance_kobo, updated_at').order('updated_at', { ascending: false }).limit(1).maybeSingle(),
        db.from('platform_revenue').select('source, amount_kobo, description, created_at').order('created_at', { ascending: false }).limit(10),
      ]);
      return {
        balance_naira: naira(t.data?.balance_kobo).toFixed(2),
        updated_at: t.data?.updated_at,
        recent_revenue: r.data || [],
      };
    }

    case 'get_wallet_liability': {
      const { data } = await db.from('wallets').select('balance_kobo, user_id').order('balance_kobo', { ascending: false }).limit(500);
      const rows = data || [];
      const total = rows.reduce((s: number, w: any) => s + Number(w.balance_kobo || 0), 0);
      return {
        wallet_count: rows.length,
        total_liability_naira: naira(total).toFixed(2),
        top_10_balances: rows.slice(0, 10).map((w: any) => ({ user_id: w.user_id, balance_naira: naira(w.balance_kobo).toFixed(2) })),
      };
    }

    case 'list_transactions': {
      let q = db.from('transactions').select('type, status, amount_kobo, description, created_at');
      if (args.type) q = q.eq('type', args.type);
      const { data } = await q.order('created_at', { ascending: false }).limit(args.limit || 15);
      return { transactions: data || [] };
    }

    case 'get_commission_report': {
      const [logs, revenue] = await Promise.all([
        db.from('commission_audit_logs').select('target_type, target_name, previous_rate, new_rate, created_at').order('created_at', { ascending: false }).limit(10),
        db.from('platform_revenue').select('amount_kobo, source, created_at').order('created_at', { ascending: false }).limit(100),
      ]);
      const total = (revenue.data || []).reduce((s: number, r: any) => s + Number(r.amount_kobo || 0), 0);
      return {
        commission_changes: logs.data || [],
        total_revenue_last_100: naira(total).toFixed(2),
      };
    }

    case 'list_disputes': {
      let q = db.from('disputes').select('id, order_id, reason, status, category, created_at');
      if (args.status === 'open') q = q.neq('status', 'resolved');
      else if (args.status === 'resolved') q = q.eq('status', 'resolved');
      const { data } = await q.order('created_at', { ascending: false }).limit(20);
      return { disputes: data || [] };
    }

    case 'get_dispute_details': {
      const { data } = await db.from('disputes').select('*').eq('id', args.dispute_id).maybeSingle();
      return { dispute: data };
    }

    case 'get_social_stats': {
      const [p, c, l, f] = await Promise.all([
        db.from('posts').select('id', { count: 'exact', head: true }),
        db.from('comments').select('id', { count: 'exact', head: true }),
        db.from('likes').select('post_id', { count: 'exact', head: true }),
        db.from('follows').select('follower_id', { count: 'exact', head: true }),
      ]);
      return { posts: p.count || 0, comments: c.count || 0, likes: l.count || 0, follows: f.count || 0 };
    }

    case 'get_security_alerts': {
      const [locked, recentLocks] = await Promise.all([
        db.from('pin_security_locks').select('user_id, locked_until').limit(20),
        db.from('pin_reset_requests').select('user_id, created_at').order('created_at', { ascending: false }).limit(10),
      ]);
      return { locked_accounts: locked.data || [], recent_reset_requests: recentLocks.data || [] };
    }

    case 'get_growth_opportunities': {
      const [slowVendors, overstocked] = await Promise.all([
        db.from('vendors').select('business_name, rating, review_count').lt('rating', 4).order('rating', { ascending: true }).limit(5),
        db.from('products').select('name, stock, sold_count').gt('stock', 50).lt('sold_count', 3).limit(10),
      ]);
      return {
        underperforming_vendors: slowVendors.data || [],
        overstocked_products: overstocked.data || [],
        suggestions: [
          'Consider coaching vendors with low ratings',
          'Overstocked products could use discounts or featured placement',
        ],
      };
    }

    case 'approve_vendor': {
      const { data, error } = await db.from('vendors').update({ status: 'active' }).eq('id', args.vendor_id).select().single();
      if (error) return { error: error.message };
      return { ok: true, message: 'Vendor approved', vendor: data };
    }

    case 'suspend_vendor': {
      const { data, error } = await db.from('vendors').update({ status: 'suspended' }).eq('id', args.vendor_id).select().single();
      if (error) return { error: error.message };
      return { ok: true, message: `Vendor suspended: ${args.reason}`, vendor: data };
    }

    case 'resolve_dispute': {
      const { data, error } = await db.from('disputes').update({ status: 'resolved', resolution_note: args.resolution_note, resolved_at: new Date().toISOString() }).eq('id', args.dispute_id).select().single();
      if (error) return { error: error.message };
      return { ok: true, message: 'Dispute resolved', dispute: data };
    }

    case 'send_admin_broadcast': {
      const { error } = await db.from('notifications').insert({
        title: args.title,
        message: args.message,
        type: 'admin_broadcast',
        audience: 'vendors',
      });
      if (error) return { error: error.message };
      return { ok: true, message: 'Broadcast sent to all vendors' };
    }

    default:
      return { error: 'Unknown tool: ' + name };
  }
}
