-- Generated trips are public by UUID and may remain unclaimed by an account.
alter table public.saved_trips
  alter column user_id drop not null;

drop policy if exists "saved_trips_select_own" on public.saved_trips;
drop policy if exists "saved_trips_select_public" on public.saved_trips;
create policy "saved_trips_select_own"
  on public.saved_trips for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "saved_trips_insert_own" on public.saved_trips;
drop policy if exists "saved_trips_insert_guest_or_own" on public.saved_trips;
create policy "saved_trips_insert_guest_or_own"
  on public.saved_trips for insert
  to anon, authenticated
  with check (
    (auth.uid() is null and user_id is null)
    or user_id = auth.uid()
  );

drop policy if exists "saved_trips_update_own" on public.saved_trips;
drop policy if exists "saved_trips_update_claim_or_own" on public.saved_trips;
create policy "saved_trips_update_claim_or_own"
  on public.saved_trips for update
  to authenticated
  using (user_id is null or auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.get_public_trip(p_trip_id uuid)
returns setof public.saved_trips
language sql
stable
security definer
set search_path = ''
as $function$
  select trip.*
  from public.saved_trips as trip
  where trip.id = p_trip_id;
$function$;

revoke all on function public.get_public_trip(uuid) from public;
grant execute on function public.get_public_trip(uuid) to anon, authenticated;