-- 1. Notifications table for in-app approval/rejection and fee announcements
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  message text not null,
  link text,
  type text default 'info',
  is_read boolean default false,
  created_at timestamptz not null default now()
);

alter table notifications enable row level security;
drop policy if exists "users read own notifications" on notifications;
create policy "users read own notifications" on notifications for select using (user_id = auth.uid());
drop policy if exists "users update own notifications" on notifications;
create policy "users update own notifications" on notifications for update using (user_id = auth.uid());
drop policy if exists "authenticated insert notifications" on notifications;
create policy "authenticated insert notifications" on notifications for insert with check (auth.role() = 'authenticated');

-- 2. Commission Audit Log table
create table if not exists commission_audit_logs (
  id uuid primary key default gen_random_uuid(),
  changed_by uuid references auth.users(id),
  target_type text not null,
  target_name text not null,
  previous_rate numeric(10,2),
  new_rate numeric(10,2) not null,
  reason text,
  created_at timestamptz not null default now()
);

alter table commission_audit_logs enable row level security;
drop policy if exists "admins read and write commission_audit_logs" on commission_audit_logs;
create policy "admins read and write commission_audit_logs" on commission_audit_logs
  for all using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- 3. Custom Scheduled Commissions / Fee Rules
create table if not exists custom_commissions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  scope text not null default 'global',
  target_id text,
  fee_type text not null default 'percent',
  fee_value numeric(10,2) not null,
  effective_date timestamptz not null,
  status text not null default 'scheduled',
  notification_sent boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table custom_commissions enable row level security;
drop policy if exists "admins manage custom_commissions" on custom_commissions;
create policy "admins manage custom_commissions" on custom_commissions
  for all using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
drop policy if exists "authenticated read custom_commissions" on custom_commissions;
create policy "authenticated read custom_commissions" on custom_commissions
  for select using (auth.role() = 'authenticated');

-- 4. Comprehensive KYC fields on vendors
alter table vendors add column if not exists full_legal_name text;
alter table vendors add column if not exists phone_number text;
alter table vendors add column if not exists residential_address text;
alter table vendors add column if not exists date_of_birth date;
alter table vendors add column if not exists nin text;
alter table vendors add column if not exists nin_verified_by_paystack boolean default false;
