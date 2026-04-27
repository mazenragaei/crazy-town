-- Crazy Town - Supabase schema + RLS baseline
-- Run this in Supabase SQL Editor.
--
-- PostgreSQL folds unquoted identifiers to lowercase. Use double quotes for
-- camelCase columns (e.g. "userId") so they match PostgREST/JS and indexes/RLS.

create extension if not exists "pgcrypto";

-- =========================
-- 1) Core tables
-- =========================
create table if not exists public.users (
  id text primary key,
  name text not null,
  email text unique,
  phone text,
  password text,
  rank text default 'member',
  roles text[] default array['member']::text[],
  balance numeric default 0,
  is_banned boolean default false,
  joined timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.bookings (
  id text primary key,
  "userId" text references public.users(id) on delete set null,
  "ticketId" text,
  name text,
  phone text,
  date text,
  time text,
  players int,
  mission text,
  "paymentMethod" text,
  price numeric default 0,
  status text default 'Pending',
  "createdAt" timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.orders (
  id text primary key,
  "userId" text references public.users(id) on delete set null,
  "userName" text,
  kind text default 'shop',
  items jsonb default '[]'::jsonb,
  delivery jsonb default '{}'::jsonb,
  total numeric default 0,
  status text default 'Pending Confirmation',
  "createdAt" timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.teams (
  id text primary key,
  name text not null,
  "captainId" text references public.users(id) on delete set null,
  members text[] default array[]::text[],
  "invitedIds" text[] default array[]::text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.support_tickets (
  id text primary key,
  "userId" text references public.users(id) on delete set null,
  "userName" text,
  category text,
  priority text default 'normal',
  message text,
  status text default 'Open',
  "createdAt" timestamptz default now(),
  "updatedAt" timestamptz
);

-- =========================
-- 2) Helpful indexes
-- =========================
create index if not exists idx_bookings_userid on public.bookings("userId");
create index if not exists idx_orders_userid on public.orders("userId");
create index if not exists idx_orders_kind on public.orders(kind);
create index if not exists idx_support_tickets_userid on public.support_tickets("userId");

-- =========================
-- 3) updated_at triggers
-- =========================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at
before update on public.users
for each row execute function public.set_updated_at();

drop trigger if exists trg_bookings_updated_at on public.bookings;
create trigger trg_bookings_updated_at
before update on public.bookings
for each row execute function public.set_updated_at();

drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

drop trigger if exists trg_teams_updated_at on public.teams;
create trigger trg_teams_updated_at
before update on public.teams
for each row execute function public.set_updated_at();

-- =========================
-- 4) RLS helpers
-- =========================
create or replace function public.is_admin_user()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.users u
    where u.id = auth.uid()::text
      and (
        'admin' = any(coalesce(u.roles, array[]::text[]))
        or 'owner' = any(coalesce(u.roles, array[]::text[]))
        or 'co-owner' = any(coalesce(u.roles, array[]::text[]))
        or 'ceo' = any(coalesce(u.roles, array[]::text[]))
      )
  );
$$;

-- =========================
-- 5) Enable RLS
-- =========================
alter table public.users enable row level security;
alter table public.bookings enable row level security;
alter table public.orders enable row level security;
alter table public.teams enable row level security;
alter table public.support_tickets enable row level security;

-- Drop old policies if rerun
drop policy if exists users_read_all on public.users;
drop policy if exists users_insert_self on public.users;
drop policy if exists users_update_self_or_admin on public.users;

drop policy if exists bookings_read_all on public.bookings;
drop policy if exists bookings_insert_owner_or_admin on public.bookings;
drop policy if exists bookings_update_admin_only on public.bookings;
drop policy if exists bookings_delete_admin_only on public.bookings;

drop policy if exists orders_read_all on public.orders;
drop policy if exists orders_insert_owner_or_admin on public.orders;
drop policy if exists orders_update_admin_only on public.orders;
drop policy if exists orders_delete_admin_only on public.orders;

drop policy if exists teams_read_all on public.teams;
drop policy if exists teams_insert_owner_or_admin on public.teams;
drop policy if exists teams_update_member_or_admin on public.teams;
drop policy if exists teams_delete_admin_only on public.teams;

drop policy if exists support_read_owner_or_admin on public.support_tickets;
drop policy if exists support_insert_owner_or_admin on public.support_tickets;
drop policy if exists support_update_admin_only on public.support_tickets;
drop policy if exists support_delete_admin_only on public.support_tickets;

-- users
create policy users_read_all
on public.users
for select
to authenticated
using (true);

create policy users_insert_self
on public.users
for insert
to authenticated
with check (id = auth.uid()::text or public.is_admin_user());

create policy users_update_self_or_admin
on public.users
for update
to authenticated
using (id = auth.uid()::text or public.is_admin_user())
with check (id = auth.uid()::text or public.is_admin_user());

-- bookings
create policy bookings_read_all
on public.bookings
for select
to authenticated
using (true);

create policy bookings_insert_owner_or_admin
on public.bookings
for insert
to authenticated
with check ("userId" = auth.uid()::text or public.is_admin_user());

create policy bookings_update_admin_only
on public.bookings
for update
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

create policy bookings_delete_admin_only
on public.bookings
for delete
to authenticated
using (public.is_admin_user());

-- orders
create policy orders_read_all
on public.orders
for select
to authenticated
using (true);

create policy orders_insert_owner_or_admin
on public.orders
for insert
to authenticated
with check ("userId" = auth.uid()::text or public.is_admin_user());

create policy orders_update_admin_only
on public.orders
for update
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

create policy orders_delete_admin_only
on public.orders
for delete
to authenticated
using (public.is_admin_user());

-- teams
create policy teams_read_all
on public.teams
for select
to authenticated
using (true);

create policy teams_insert_owner_or_admin
on public.teams
for insert
to authenticated
with check ("captainId" = auth.uid()::text or public.is_admin_user());

create policy teams_update_member_or_admin
on public.teams
for update
to authenticated
using (
  public.is_admin_user()
  or auth.uid()::text = any(coalesce(members, array[]::text[]))
)
with check (
  public.is_admin_user()
  or auth.uid()::text = any(coalesce(members, array[]::text[]))
);

create policy teams_delete_admin_only
on public.teams
for delete
to authenticated
using (public.is_admin_user());

-- support_tickets
create policy support_read_owner_or_admin
on public.support_tickets
for select
to authenticated
using ("userId" = auth.uid()::text or public.is_admin_user());

create policy support_insert_owner_or_admin
on public.support_tickets
for insert
to authenticated
with check ("userId" = auth.uid()::text or public.is_admin_user());

create policy support_update_admin_only
on public.support_tickets
for update
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

create policy support_delete_admin_only
on public.support_tickets
for delete
to authenticated
using (public.is_admin_user());

-- =========================
-- 6) Realtime publication
-- =========================
alter publication supabase_realtime add table public.bookings;
alter publication supabase_realtime add table public.orders;

-- NOTE:
-- These policies require Supabase Auth sessions (authenticated role + auth.uid()).
-- If your frontend still uses only anon key without user auth, RLS checks will block writes.
