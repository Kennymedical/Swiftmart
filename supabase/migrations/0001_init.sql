-- ============================================================================
-- SWIFTMART — Supabase schema
-- ============================================================================
-- Design notes:
-- - auth.users (Supabase Auth) is the identity source of truth. `profiles`
--   is a 1:1 public-schema row keyed by auth.users.id — this is the
--   standard Supabase pattern since you can't add arbitrary columns to
--   auth.users directly, and RLS needs a public-schema table to reference.
-- - Money is stored as BIGINT in kobo (smallest currency unit), same
--   rationale as any fintech schema: no floats near cash.
-- - RLS is ON for every table. Supabase exposes tables directly to the
--   client via PostgREST, so row-level security IS the authorization layer
--   here — there's no NestJS guard standing in front of these reads.
-- ============================================================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm"; -- for fast ILIKE / fuzzy search

-- ============================================================================
-- ENUMS
-- ============================================================================

create type user_role as enum ('customer', 'vendor', 'admin');
create type vendor_status as enum ('pending', 'under_review', 'approved', 'rejected', 'suspended');
create type product_status as enum ('draft', 'active', 'out_of_stock', 'archived', 'rejected');
create type order_status as enum (
  'pending_payment', 'paid', 'processing', 'shipped', 'delivered', 'completed',
  'cancelled', 'refunded', 'disputed'
);
create type transaction_type as enum (
  'wallet_funding', 'order_payment', 'escrow_hold', 'escrow_release',
  'escrow_refund', 'commission', 'payout', 'p2p_send', 'p2p_receive'
);
create type transaction_status as enum ('pending', 'success', 'failed', 'reversed');
create type notification_type as enum (
  'follow', 'like', 'comment', 'wallet_credit', 'wallet_debit', 'order_update', 'system'
);

-- ============================================================================
-- PROFILES (1:1 with auth.users)
-- ============================================================================

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  full_name text,
  phone text unique,
  phone_verified boolean not null default false,
  avatar_url text,
  cover_url text,
  bio text,
  role user_role not null default 'customer',
  follower_count int not null default 0,
  following_count int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_username_trgm on profiles using gin (username gin_trgm_ops);

-- Auto-create a profile row whenever a new auth.users row is created.
-- This is what makes registration "just work" from the client — the app
-- never has to remember to insert into `profiles` itself.
create function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'full_name',
    new.phone
  );

  -- Every user gets a wallet the moment they exist — same invariant as the
  -- marketplace app: no user should ever be in a state where they can't
  -- receive money.
  insert into public.wallets (user_id) values (new.id);

  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================================
-- SOCIAL GRAPH: follows
-- ============================================================================

create table follows (
  follower_id uuid not null references profiles(id) on delete cascade,
  following_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint no_self_follow check (follower_id <> following_id)
);

-- Keeps follower_count/following_count on `profiles` correct without the
-- client ever computing them — every UI that shows a count just reads the
-- cached column instead of running a COUNT(*) query.
create function handle_follow_change()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update profiles set following_count = following_count + 1 where id = new.follower_id;
    update profiles set follower_count = follower_count + 1 where id = new.following_id;
  elsif TG_OP = 'DELETE' then
    update profiles set following_count = following_count - 1 where id = old.follower_id;
    update profiles set follower_count = follower_count - 1 where id = old.following_id;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger on_follow_change
  after insert or delete on follows
  for each row execute procedure handle_follow_change();

-- ============================================================================
-- VENDORS
-- ============================================================================

create table vendors (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid unique not null references profiles(id) on delete cascade,
  business_name text not null,
  slug text unique not null,
  banner_url text,
  description text,
  status vendor_status not null default 'pending',
  kyc_bank_account_name text,
  kyc_bank_account_number text,
  kyc_bank_code text,
  commission_rate numeric(5,2) not null default 10.0,
  rating numeric(3,2) not null default 0,
  review_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- CATEGORIES & PRODUCTS
-- ============================================================================

create table categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  image_url text
);

create table products (
  id uuid primary key default uuid_generate_v4(),
  vendor_id uuid not null references vendors(id) on delete cascade,
  category_id uuid references categories(id),
  name text not null,
  slug text unique not null,
  description text,
  images text[] not null default '{}',
  price_kobo bigint not null check (price_kobo >= 0),
  compare_at_kobo bigint,
  stock int not null default 0 check (stock >= 0),
  status product_status not null default 'draft',
  rating numeric(3,2) not null default 0,
  review_count int not null default 0,
  sold_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_name_trgm on products using gin (name gin_trgm_ops);
create index products_vendor_idx on products (vendor_id);
create index products_status_idx on products (status);

-- ============================================================================
-- FEED: posts, likes, comments, stories
-- ============================================================================

-- A post is what renders as a PostCard in the feed. `product_id` is
-- optional — a vendor can post plain updates, or attach a product to sell
-- directly from the feed (the "Body: Text + Product" requirement).
create table posts (
  id uuid primary key default uuid_generate_v4(),
  author_id uuid not null references profiles(id) on delete cascade,
  vendor_id uuid references vendors(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  content text,
  image_urls text[] not null default '{}',
  like_count int not null default 0,
  comment_count int not null default 0,
  share_count int not null default 0,
  created_at timestamptz not null default now()
);
create index posts_author_idx on posts (author_id);
create index posts_created_idx on posts (created_at desc);

create table likes (
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table comments (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);
create index comments_post_idx on comments (post_id);

create table saved_posts (
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create function handle_like_change()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update posts set like_count = like_count + 1 where id = new.post_id;
  elsif TG_OP = 'DELETE' then
    update posts set like_count = like_count - 1 where id = old.post_id;
  end if;
  return null;
end;
$$ language plpgsql security definer;
create trigger on_like_change after insert or delete on likes
  for each row execute procedure handle_like_change();

create function handle_comment_change()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update posts set comment_count = comment_count + 1 where id = new.post_id;
  elsif TG_OP = 'DELETE' then
    update posts set comment_count = comment_count - 1 where id = old.post_id;
  end if;
  return null;
end;
$$ language plpgsql security definer;
create trigger on_comment_change after insert or delete on comments
  for each row execute procedure handle_comment_change();

-- Stories: 24h-expiring content shown in the story bar.
create table stories (
  id uuid primary key default uuid_generate_v4(),
  vendor_id uuid not null references vendors(id) on delete cascade,
  media_url text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);
create index stories_expires_idx on stories (expires_at);

-- ============================================================================
-- ORDERS
-- ============================================================================

create table addresses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  label text not null,
  full_name text not null,
  phone text not null,
  line1 text not null,
  city text not null,
  state text not null,
  is_default boolean not null default false
);

create table orders (
  id uuid primary key default uuid_generate_v4(),
  order_number text unique not null,
  customer_id uuid not null references profiles(id),
  shipping_address_id uuid references addresses(id),
  status order_status not null default 'pending_payment',
  subtotal_kobo bigint not null,
  shipping_kobo bigint not null default 0,
  total_kobo bigint not null,
  commission_kobo bigint not null default 0,
  payment_reference text unique,
  paid_with_wallet boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id),
  vendor_id uuid not null references vendors(id),
  product_name text not null,
  unit_price_kobo bigint not null,
  quantity int not null check (quantity > 0),
  line_total_kobo bigint not null,
  commission_kobo bigint not null,
  vendor_payout_kobo bigint not null
);
create index order_items_order_idx on order_items (order_id);
create index order_items_vendor_idx on order_items (vendor_id);

-- ============================================================================
-- FINTECH: wallets, transactions, virtual accounts
-- ============================================================================

create table wallets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid unique not null references profiles(id) on delete cascade,
  balance_kobo bigint not null default 0 check (balance_kobo >= 0),
  currency text not null default 'NGN',
  -- Paystack Dedicated Virtual Account (DVA) — a unique bank account number
  -- per user that credits their wallet on transfer, i.e. the OPay-style
  -- "fund by bank transfer" experience.
  paystack_customer_code text,
  virtual_account_number text,
  virtual_account_bank text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table transactions (
  id uuid primary key default uuid_generate_v4(),
  wallet_id uuid not null references wallets(id),
  order_id uuid references orders(id),
  counterparty_wallet_id uuid references wallets(id), -- set for p2p_send/p2p_receive
  type transaction_type not null,
  status transaction_status not null default 'pending',
  amount_kobo bigint not null check (amount_kobo > 0),
  balance_after_kobo bigint not null,
  provider_reference text unique,
  description text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index transactions_wallet_idx on transactions (wallet_id);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

create table notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  type notification_type not null,
  title text not null,
  body text not null,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_unread_idx on notifications (user_id, read_at);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
-- Supabase serves these tables straight to the client via PostgREST, so
-- every table needs RLS on with explicit policies — there is no NestJS
-- controller standing between the browser and Postgres here.

alter table profiles enable row level security;
alter table follows enable row level security;
alter table vendors enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table posts enable row level security;
alter table likes enable row level security;
alter table comments enable row level security;
alter table saved_posts enable row level security;
alter table stories enable row level security;
alter table addresses enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table wallets enable row level security;
alter table transactions enable row level security;
alter table notifications enable row level security;

-- Profiles: public read, self-only write.
create policy "profiles are publicly readable" on profiles for select using (true);
create policy "users update own profile" on profiles for update using (auth.uid() = id);

-- Follows: public read, self-only insert/delete.
create policy "follows are publicly readable" on follows for select using (true);
create policy "users manage own follows" on follows for insert with check (auth.uid() = follower_id);
create policy "users remove own follows" on follows for delete using (auth.uid() = follower_id);

-- Vendors/categories/products: public read of approved/active rows; vendor
-- owner can read+write their own regardless of status (so they can see
-- their own pending/rejected listings).
create policy "approved vendors are publicly readable" on vendors
  for select using (status = 'approved' or user_id = auth.uid());
create policy "vendor owner manages own vendor row" on vendors
  for update using (user_id = auth.uid());

create policy "categories are publicly readable" on categories for select using (true);

create policy "active products are publicly readable" on products
  for select using (
    status = 'active'
    or vendor_id in (select id from vendors where user_id = auth.uid())
  );
create policy "vendor owner manages own products" on products
  for all using (vendor_id in (select id from vendors where user_id = auth.uid()));

-- Feed: posts/likes/comments are public read; write requires being the author.
create policy "posts are publicly readable" on posts for select using (true);
create policy "authenticated users create posts" on posts
  for insert with check (auth.uid() = author_id);
create policy "authors manage own posts" on posts
  for update using (auth.uid() = author_id);
create policy "authors delete own posts" on posts
  for delete using (auth.uid() = author_id);

create policy "likes are publicly readable" on likes for select using (true);
create policy "users like as themselves" on likes for insert with check (auth.uid() = user_id);
create policy "users unlike own likes" on likes for delete using (auth.uid() = user_id);

create policy "comments are publicly readable" on comments for select using (true);
create policy "users comment as themselves" on comments for insert with check (auth.uid() = user_id);

create policy "users manage own saved posts" on saved_posts for all using (auth.uid() = user_id);

create policy "stories are publicly readable" on stories
  for select using (expires_at > now());
create policy "vendor owner creates own stories" on stories
  for insert with check (vendor_id in (select id from vendors where user_id = auth.uid()));

-- Addresses/orders/order_items: strictly owner-only.
create policy "users manage own addresses" on addresses for all using (user_id = auth.uid());

create policy "customers read own orders" on orders for select using (customer_id = auth.uid());
create policy "vendors read orders containing their items" on orders for select using (
  id in (
    select order_id from order_items
    where vendor_id in (select id from vendors where user_id = auth.uid())
  )
);

create policy "customers read own order items" on order_items for select using (
  order_id in (select id from orders where customer_id = auth.uid())
);
create policy "vendors read their own order items" on order_items for select using (
  vendor_id in (select id from vendors where user_id = auth.uid())
);

-- Wallets/transactions: strictly owner-only. No policy allows any user to
-- read another user's wallet or transaction history — every write happens
-- through a service-role Edge Function anyway, never directly from the
-- client, but read access still needs to be locked down per-user.
create policy "users read own wallet" on wallets for select using (user_id = auth.uid());
create policy "users read own transactions" on transactions for select using (
  wallet_id in (select id from wallets where user_id = auth.uid())
);

create policy "users read own notifications" on notifications
  for select using (user_id = auth.uid());
create policy "users mark own notifications read" on notifications
  for update using (user_id = auth.uid());

-- ============================================================================
-- ATOMIC WALLET TRANSFER (RPC)
-- ============================================================================
-- Called via supabase.rpc() from the wallet-transfer Edge Function, never
-- directly from the client (client has no UPDATE policy on `wallets`).
-- SECURITY DEFINER + explicit row locking (`for update`) is what prevents
-- two concurrent transfers from the same wallet from both reading a stale
-- balance and overdrawing it.
create function transfer_wallet_funds(
  p_sender_wallet_id uuid,
  p_recipient_wallet_id uuid,
  p_amount_kobo bigint,
  p_description text
) returns void as $$
declare
  v_sender_balance bigint;
  v_recipient_balance bigint;
begin
  if p_amount_kobo <= 0 then
    raise exception 'Transfer amount must be positive';
  end if;
  if p_sender_wallet_id = p_recipient_wallet_id then
    raise exception 'Cannot transfer to your own wallet';
  end if;

  -- Lock both rows in a consistent order (by id) to avoid deadlocks between
  -- two transfers that happen to involve the same pair of wallets in
  -- opposite directions at the same time.
  perform 1 from wallets where id in (p_sender_wallet_id, p_recipient_wallet_id)
    order by id for update;

  select balance_kobo into v_sender_balance from wallets where id = p_sender_wallet_id;
  select balance_kobo into v_recipient_balance from wallets where id = p_recipient_wallet_id;

  if v_sender_balance is null or v_recipient_balance is null then
    raise exception 'Wallet not found';
  end if;
  if v_sender_balance < p_amount_kobo then
    raise exception 'Insufficient balance';
  end if;

  update wallets set balance_kobo = balance_kobo - p_amount_kobo, updated_at = now()
    where id = p_sender_wallet_id;
  update wallets set balance_kobo = balance_kobo + p_amount_kobo, updated_at = now()
    where id = p_recipient_wallet_id;

  insert into transactions (wallet_id, counterparty_wallet_id, type, status, amount_kobo, balance_after_kobo, description)
    values (p_sender_wallet_id, p_recipient_wallet_id, 'p2p_send', 'success', p_amount_kobo, v_sender_balance - p_amount_kobo, p_description);
  insert into transactions (wallet_id, counterparty_wallet_id, type, status, amount_kobo, balance_after_kobo, description)
    values (p_recipient_wallet_id, p_sender_wallet_id, 'p2p_receive', 'success', p_amount_kobo, v_recipient_balance + p_amount_kobo, p_description);
end;
$$ language plpgsql security definer;
