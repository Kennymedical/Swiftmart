-- ============================================================================
-- 0004: PLATFORM COMMISSIONS & STRICT RLS SECURITY
-- ============================================================================

-- 1. Platform Settings table for global commission and rules
create table if not exists platform_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamptz not null default now()
);

-- Seed global commission rate (default 10%)
insert into platform_settings (key, value, description)
values (
  'global_commission_rate',
  '{"rate_percent": 10.0}',
  'Global platform commission rate applied to vendor sales'
)
on conflict (key) do nothing;

alter table platform_settings enable row level security;

-- Platform settings RLS: readable by authenticated users, writable only by admins
create policy "platform_settings are readable by authenticated" on platform_settings
  for select using (auth.role() = 'authenticated');

create policy "admins manage platform_settings" on platform_settings
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- 2. Enhanced Products RLS:
-- Vendor owners can only insert/update/delete their own products.
-- Admins retain full control over all products for moderation.
drop policy if exists "vendor owner manages own products" on products;
drop policy if exists "active products are publicly readable" on products;

create policy "active products are publicly readable" on products
  for select using (
    status = 'active'
    or vendor_id in (select id from vendors where user_id = auth.uid())
    or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "vendor owner manages own products" on products
  for all using (
    vendor_id in (select id from vendors where user_id = auth.uid())
  )
  with check (
    vendor_id in (select id from vendors where user_id = auth.uid())
  );

create policy "admins manage all products" on products
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- 3. Enhanced Transactions & Payouts RLS:
-- Users/vendors can only read transactions tied to their own wallet.
-- Admins can read all transactions (for treasury audit & payout queue) and update payout status.
drop policy if exists "users read own transactions" on transactions;

create policy "users read own transactions" on transactions
  for select using (
    wallet_id in (select id from wallets where user_id = auth.uid())
    or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "admins update transactions" on transactions
  for update using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );
