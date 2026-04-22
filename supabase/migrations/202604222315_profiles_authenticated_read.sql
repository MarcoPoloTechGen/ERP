drop policy if exists "profiles authenticated read" on public.profiles;
drop policy if exists "profiles read own or admin" on public.profiles;

create policy "profiles authenticated read"
on public.profiles
for select
to authenticated
using (true);
