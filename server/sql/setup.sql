-- הרץ ב-Supabase → SQL Editor
-- טבלת לידים (כמו באפיון) + הרחבות תאימות

create extension if not exists "pgcrypto";

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  full_name text,
  phone text,
  email text,
  message text,
  page_source text,
  status text default 'new',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_status_idx on public.leads (status);
create index if not exists leads_page_source_idx on public.leads (page_source);

-- אם משתמשים ב-SUPABASE_ANON_KEY בלבד בשרת (בלי service_role), יש לאפשר ל-anon גישה דרך RLS:
alter table public.leads enable row level security;

drop policy if exists "anon_insert_leads" on public.leads;
drop policy if exists "anon_select_leads" on public.leads;
drop policy if exists "anon_update_leads" on public.leads;
drop policy if exists "anon_delete_leads" on public.leads;

create policy "anon_insert_leads"
  on public.leads for insert
  to anon
  with check (true);

create policy "anon_select_leads"
  on public.leads for select
  to anon
  using (true);

create policy "anon_update_leads"
  on public.leads for update
  to anon
  using (true)
  with check (true);

create policy "anon_delete_leads"
  on public.leads for delete
  to anon
  using (true);

-- אם עברת ל-SUPABASE_SERVICE_ROLE_KEY בשרת, המפתח service_role עוקף RLS — אפשר למחוק את המדיניות למעלה
-- או להשאיר — לא מזיק.
