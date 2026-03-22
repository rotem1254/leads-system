-- Multi-client platform: profiles, landing pages, lead ownership
-- Safe migration: new columns nullable; backfill where possible.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Role enum
-- ---------------------------------------------------------------------------
do $$ begin
  create type user_role as enum ('admin', 'client');
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  role user_role not null default 'client',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_role on public.profiles (role);
create index if not exists idx_profiles_is_active on public.profiles (is_active);

create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.set_profiles_updated_at();

-- ---------------------------------------------------------------------------
-- landing_pages
-- ---------------------------------------------------------------------------
create table if not exists public.landing_pages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  user_id uuid not null references public.profiles (id) on delete restrict,
  public_token text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint landing_pages_slug_unique unique (slug),
  constraint landing_pages_public_token_unique unique (public_token)
);

create index if not exists idx_landing_pages_user_id on public.landing_pages (user_id);
create index if not exists idx_landing_pages_is_active on public.landing_pages (is_active);

create or replace function public.set_landing_pages_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists landing_pages_updated_at on public.landing_pages;
create trigger landing_pages_updated_at
  before update on public.landing_pages
  for each row
  execute function public.set_landing_pages_updated_at();

-- ---------------------------------------------------------------------------
-- leads: ownership columns (nullable for legacy rows)
-- ---------------------------------------------------------------------------
alter table public.leads
  add column if not exists landing_page_id uuid references public.landing_pages (id) on delete set null;

alter table public.leads
  add column if not exists user_id uuid references public.profiles (id) on delete set null;

create index if not exists idx_leads_landing_page_id on public.leads (landing_page_id);
create index if not exists idx_leads_user_id on public.leads (user_id);

-- ---------------------------------------------------------------------------
-- Auto-create profile on new auth user (default: client)
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, is_active)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), ''),
    'client',
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Backfill profiles for existing auth users (if any)
-- ---------------------------------------------------------------------------
insert into public.profiles (id, full_name, role, is_active)
select
  u.id,
  coalesce(nullif(trim(u.raw_user_meta_data->>'full_name'), ''), split_part(u.email, '@', 1)),
  'client',
  true
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- RLS: keep locked down; Next.js uses service role (bypasses RLS)
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.landing_pages enable row level security;

comment on table public.profiles is 'App user metadata; id matches auth.users';
comment on table public.landing_pages is 'Landing page configs; public_token used for lead ingestion';
comment on column public.leads.landing_page_id is 'Resolved from landing_token on ingest';
comment on column public.leads.user_id is 'Owner client (profiles.id); copied from landing_pages.user_id';
