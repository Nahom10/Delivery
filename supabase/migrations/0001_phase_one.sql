-- Phase 1 schema. Apply this before replacing the development repository with Supabase.
create extension if not exists postgis;
create extension if not exists pgcrypto;

create or replace function public.telegram_user_id()
returns bigint
language sql stable
as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'telegram_user_id', '')::bigint
$$;

create or replace function public.is_admin()
returns boolean
language sql stable
as $$
  select coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'app_role', '') = 'admin'
$$;

create table if not exists public.users (
  telegram_user_id bigint primary key,
  username text,
  first_name text,
  last_name text,
  language_code text not null default 'en',
  phone_number text,
  phone_verified boolean not null default false,
  app_role text not null default 'customer' check (app_role in ('customer', 'admin', 'staff', 'rider')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_am text,
  sort_order integer not null default 0,
  active boolean not null default true
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id),
  name text not null,
  name_am text,
  description text,
  price numeric(12,2) not null check (price >= 0),
  unit text not null,
  stock integer not null default 0 check (stock >= 0),
  image_path text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_discounts (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  discount_type text not null check (discount_type in ('percentage', 'fixed')),
  discount_value numeric(12,2) not null check (discount_value >= 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  active boolean not null default true,
  check (ends_at > starts_at)
);

create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  image_path text not null,
  target_type text not null check (target_type in ('product', 'category', 'sale')),
  target_id text,
  priority integer not null default 0,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  active boolean not null default true,
  check (ends_at > starts_at)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null,
  telegram_user_id bigint not null references public.users(telegram_user_id),
  order_type text not null check (order_type in ('pickup', 'delivery')),
  fulfillment_status text not null default 'placed',
  payment_method text not null check (payment_method in ('cash', 'telebirr')),
  payment_status text not null default 'pending',
  subtotal numeric(12,2) not null check (subtotal >= 0),
  delivery_fee numeric(12,2) not null default 0 check (delivery_fee >= 0),
  total numeric(12,2) not null check (total >= 0),
  customer_note text,
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id),
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit text not null,
  unit_price numeric(12,2) not null check (unit_price >= 0),
  line_total numeric(12,2) not null check (line_total >= 0)
);

alter table public.users enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_discounts enable row level security;
alter table public.promotions enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "users read own profile" on public.users for select using (telegram_user_id = public.telegram_user_id());
create policy "users update own safe profile" on public.users for update using (telegram_user_id = public.telegram_user_id()) with check (telegram_user_id = public.telegram_user_id());
create policy "admins manage users" on public.users for all using (public.is_admin()) with check (public.is_admin());
create policy "active categories are visible" on public.categories for select using (active or public.is_admin());
create policy "admins manage categories" on public.categories for all using (public.is_admin()) with check (public.is_admin());
create policy "active products are visible" on public.products for select using (active or public.is_admin());
create policy "admins manage products" on public.products for all using (public.is_admin()) with check (public.is_admin());
create policy "active discounts are visible" on public.product_discounts for select using (active or public.is_admin());
create policy "admins manage discounts" on public.product_discounts for all using (public.is_admin()) with check (public.is_admin());
create policy "active promotions are visible" on public.promotions for select using (active or public.is_admin());
create policy "admins manage promotions" on public.promotions for all using (public.is_admin()) with check (public.is_admin());
create policy "users read own orders" on public.orders for select using (telegram_user_id = public.telegram_user_id() or public.is_admin());
create policy "admins manage orders" on public.orders for all using (public.is_admin()) with check (public.is_admin());
create policy "users read own order items" on public.order_items for select using (exists (select 1 from public.orders where orders.id = order_items.order_id and (orders.telegram_user_id = public.telegram_user_id() or public.is_admin())));
create policy "admins manage order items" on public.order_items for all using (public.is_admin()) with check (public.is_admin());

-- Customers never insert price-bearing orders directly through RLS. The authenticated API transaction
-- recomputes the price and creates order/order_items with a server-only service role.
