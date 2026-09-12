-- PackrOn: self-service account deletion
--
-- Run once in the Supabase SQL editor (paste the CONTENTS, not the filename).
--
-- Why a function: the app intentionally has no service-role key, so it cannot
-- call auth.admin.deleteUser. This SECURITY DEFINER function (owned by
-- postgres) lets a logged-in user delete ONLY their own auth.users row.
-- saved_trips rows cascade via ON DELETE CASCADE. EXECUTE is granted to
-- `authenticated` only; `anon` and `public` are explicitly revoked.

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
