-- Phase 2: geocoded customer addresses, editable fee rules, and PostGIS service zones.
create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id bigint not null references public.users(telegram_user_id) on delete cascade,
  label text not null default 'Home',
  location geography(point, 4326) not null,
  house_number text,
  block_number text,
  street text,
  area text,
  landmark text,
  floor_unit text,
  delivery_notes text,
  address_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists addresses_owner_idx on public.addresses(telegram_user_id);
create index if not exists addresses_location_idx on public.addresses using gist(location);

create table if not exists public.delivery_fee_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Default',
  origin geography(point, 4326) not null,
  base_fee numeric(12,2) not null check (base_fee >= 0),
  included_km numeric(8,2) not null check (included_km >= 0),
  per_km_rate numeric(12,2) not null check (per_km_rate >= 0),
  free_delivery_threshold numeric(12,2) not null check (free_delivery_threshold >= 0),
  free_delivery_max_km numeric(8,2) not null check (free_delivery_max_km >= 0),
  max_service_km numeric(8,2) not null check (max_service_km > 0),
  currency text not null default 'ETB',
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by bigint references public.users(telegram_user_id),
  check (free_delivery_max_km <= max_service_km)
);

-- Replace this test origin with the exact shop coordinate before production.
insert into public.delivery_fee_rules (name, origin, base_fee, included_km, per_km_rate, free_delivery_threshold, free_delivery_max_km, max_service_km, currency)
select 'Default', st_setsrid(st_makepoint(38.7400, 9.0300), 4326)::geography, 30, 2, 8, 500, 5, 10, 'ETB'
where not exists (select 1 from public.delivery_fee_rules where active);

create table if not exists public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('inclusion', 'exclusion')),
  zone_type text not null check (zone_type in ('radius', 'polygon')),
  center geography(point, 4326),
  radius_km numeric(8,2),
  area geometry(geometry, 4326),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((zone_type = 'radius' and center is not null and radius_km > 0 and area is null) or (zone_type = 'polygon' and area is not null and center is null and radius_km is null))
);
create index if not exists delivery_zones_center_idx on public.delivery_zones using gist(center);
create index if not exists delivery_zones_area_idx on public.delivery_zones using gist(area);

alter table public.orders add column if not exists address_id uuid references public.addresses(id);
alter table public.orders add column if not exists delivery_distance_km numeric(8,2);
alter table public.orders add column if not exists delivery_fee_breakdown jsonb;
alter table public.orders add column if not exists delivery_address_snapshot jsonb;

alter table public.addresses enable row level security;
alter table public.delivery_fee_rules enable row level security;
alter table public.delivery_zones enable row level security;

create policy "users manage own addresses" on public.addresses for all
  using (telegram_user_id = public.telegram_user_id() or public.is_admin())
  with check (telegram_user_id = public.telegram_user_id() or public.is_admin());
create policy "authenticated users read active delivery rules" on public.delivery_fee_rules for select
  using (active or public.is_admin());
create policy "admins manage delivery fee rules" on public.delivery_fee_rules for all
  using (public.is_admin()) with check (public.is_admin());
create policy "authenticated users read active delivery zones" on public.delivery_zones for select
  using (active or public.is_admin());
create policy "admins manage delivery zones" on public.delivery_zones for all
  using (public.is_admin()) with check (public.is_admin());

-- Production quote query building blocks. Call only from the authenticated server transaction:
--   ST_DWithin(address.location, rule.origin, rule.max_service_km * 1000)
--   ST_Covers(zone.area, address.location::geometry) for polygon zones
-- The Node API retains the same rule logic, computes route distance through OpenRouteService when configured,
-- and stores this immutable fee/distance snapshot with each order for auditability.
