-- PackrOn: trip favourites.
--
-- Every generated trip is already a row in saved_trips (see
-- 20261002000000_unify_trip_storage.sql), so the old manual "Save trip"
-- flow is gone. The trip-view button now only toggles this flag
-- ("Add to favourites"), and My Trips renders favourited rows in a
-- separate top section.

alter table public.saved_trips
  add column if not exists is_favorite boolean not null default false;

create index if not exists saved_trips_user_fav_idx
  on public.saved_trips (user_id, is_favorite, updated_at desc);
