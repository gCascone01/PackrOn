-- PackrOn: saved trips (Supabase / Postgres with RLS)
--
-- Run with: supabase db push  (or paste into the Supabase SQL editor)
--
-- Security model:
-- - Auth: Supabase Auth (GoTrue) — passwords are bcrypt-hashed server-side,
--   sessions are JWTs in httpOnly Secure SameSite=Lax cookies via @supabase/ssr
--   with PKCE. This app never stores or logs passwords/tokens.
-- - Encryption: TLS 1.2+ in transit; AES-256 at rest (Supabase-managed).
-- - Authorization: Row Level Security forces user_id = auth.uid() on every
--   SELECT/INSERT/UPDATE/DELETE. user_id is always taken from the server-side
--   session (auth.uid()), never from client input (prevents IDOR).
-- - No service-role key is used by the app; anon key + RLS is sufficient.

create table if not exists public.saved_trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  mode text not null check (mode in ('road', 'city')),
  origin text not null default '',
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.saved_trips enable row level security;

drop policy if exists "saved_trips_select_own" on public.saved_trips;
create policy "saved_trips_select_own"
  on public.saved_trips for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "saved_trips_insert_own" on public.saved_trips;
create policy "saved_trips_insert_own"
  on public.saved_trips for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "saved_trips_update_own" on public.saved_trips;
create policy "saved_trips_update_own"
  on public.saved_trips for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "saved_trips_delete_own" on public.saved_trips;
create policy "saved_trips_delete_own"
  on public.saved_trips for delete
  to authenticated
  using (auth.uid() = user_id);

create index if not exists saved_trips_user_updated_idx
  on public.saved_trips (user_id, updated_at desc);

drop trigger if exists saved_trips_touch_updated_at on public.saved_trips;
create or replace function public.saved_trips_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger saved_trips_touch_updated_at
  before update on public.saved_trips
  for each row execute function public.saved_trips_touch_updated_at();
