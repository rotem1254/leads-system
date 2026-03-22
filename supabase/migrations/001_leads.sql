-- Central leads table — single source of truth for landing pages + admin
-- Run in Supabase SQL Editor or via supabase db push

create extension if not exists "pgcrypto";

do $$ begin
  create type lead_status as enum ('new', 'in_progress', 'closed', 'irrelevant');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  email text,
  message text,
  page_source text not null,
  status lead_status not null default 'new',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_leads_created_at on public.leads (created_at desc);
create index if not exists idx_leads_status on public.leads (status);
create index if not exists idx_leads_phone on public.leads (phone);
create index if not exists idx_leads_page_source on public.leads (page_source);

create or replace function public.set_leads_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists leads_updated_at on public.leads;
create trigger leads_updated_at
  before update on public.leads
  for each row
  execute function public.set_leads_updated_at();

alter table public.leads enable row level security;

-- No direct client access: all access goes through Next.js API (service role).
-- Service role bypasses RLS. If you add anon client reads later, add policies here.

comment on table public.leads is 'Central lead inbox — POST via Next.js API only';
