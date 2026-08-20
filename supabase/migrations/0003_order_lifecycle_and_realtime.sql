-- Phase 3: staff/rider operations, immutable order transitions, tracking, proof, and Realtime.
alter table public.orders add column if not exists assigned_rider_telegram_user_id bigint references public.users(telegram_user_id);
alter table public.orders add column if not exists delivered_at timestamptz;
alter table public.orders add column if not exists completed_at timestamptz;
alter table public.orders add column if not exists proof_of_delivery_path text;
alter table public.orders add column if not exists proof_customer_name text;

create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  from_status text,
  to_status text not null,
  actor_telegram_user_id bigint references public.users(telegram_user_id),
  actor_role text not null check (actor_role in ('customer', 'admin', 'staff', 'rider', 'system')),
  event_type text not null default 'status_change',
  created_at timestamptz not null default now()
);
create index if not exists order_status_history_order_idx on public.order_status_history(order_id, created_at);

create table if not exists public.rider_locations (
  rider_telegram_user_id bigint primary key references public.users(telegram_user_id) on delete cascade,
  location geography(point, 4326) not null,
  updated_at timestamptz not null default now()
);
create index if not exists rider_locations_location_idx on public.rider_locations using gist(location);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id bigint not null references public.users(telegram_user_id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  channel text not null default 'telegram',
  notification_type text not null,
  body text not null,
  delivery_status text not null default 'pending' check (delivery_status in ('pending', 'sent', 'failed')),
  provider_reference text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

alter table public.order_status_history enable row level security;
alter table public.rider_locations enable row level security;
alter table public.notifications enable row level security;

create policy "owners and operators read status history" on public.order_status_history for select using (
  exists (select 1 from public.orders where orders.id = order_status_history.order_id and (orders.telegram_user_id = public.telegram_user_id() or orders.assigned_rider_telegram_user_id = public.telegram_user_id() or public.is_admin()))
);
create policy "service inserts status history" on public.order_status_history for insert with check (public.is_admin());
create policy "rider publishes own location" on public.rider_locations for all using (rider_telegram_user_id = public.telegram_user_id() or public.is_admin()) with check (rider_telegram_user_id = public.telegram_user_id() or public.is_admin());
create policy "customers read assigned rider location only during delivery" on public.rider_locations for select using (
  rider_telegram_user_id = public.telegram_user_id() or public.is_admin() or exists (select 1 from public.orders where orders.assigned_rider_telegram_user_id = rider_locations.rider_telegram_user_id and orders.telegram_user_id = public.telegram_user_id() and orders.fulfillment_status in ('out_for_delivery', 'delivered', 'completed'))
);
create policy "users read their notifications" on public.notifications for select using (telegram_user_id = public.telegram_user_id() or public.is_admin());
create policy "service manages notifications" on public.notifications for all using (public.is_admin()) with check (public.is_admin());

-- Add live-tracking tables to Supabase Realtime once. Database writes remain server-authorized.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders') then
    alter publication supabase_realtime add table public.orders;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rider_locations') then
    alter publication supabase_realtime add table public.rider_locations;
  end if;
end $$;

-- Create a private delivery-proofs bucket in the Storage dashboard. Use signed URLs, never a public bucket.
-- The API must write proof images with the service role, using paths such as orders/<order-id>/<uuid>.jpg.
