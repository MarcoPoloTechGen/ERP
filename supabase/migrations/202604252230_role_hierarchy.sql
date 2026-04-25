alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('super_admin', 'admin', 'user'));

update public.profiles
set role = 'super_admin'
where id = (
  select p.id
  from public.profiles as p
  where p.role = 'admin'
  order by p.created_at asc nulls last, p.id asc
  limit 1
)
and not exists (
  select 1
  from public.profiles as p
  where p.role = 'super_admin'
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  assigned_role text := 'user';
begin
  if not exists (select 1 from public.profiles) then
    assigned_role := 'super_admin';
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''), assigned_role)
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name);

  return new;
end;
$$;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select p.role
      from public.profiles as p
      where p.id = auth.uid()
    ),
    'user'
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.role() = 'authenticated' and public.current_user_role() = 'super_admin';
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.role() = 'authenticated' and public.current_user_role() in ('super_admin', 'admin');
$$;

drop policy if exists "profiles insert self" on public.profiles;
create policy "profiles insert self"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id and role = 'user');

drop policy if exists "profiles update own or admin" on public.profiles;
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id and role = public.current_user_role());

drop policy if exists "profiles admin update" on public.profiles;
create policy "profiles admin update"
on public.profiles
for update
to authenticated
using (
  public.is_admin()
  and (
    public.is_super_admin()
    or role <> 'super_admin'
  )
)
with check (
  public.is_super_admin()
  or role in ('admin', 'user')
);

drop policy if exists "projects admin write" on public.projects;
drop policy if exists "projects admin insert" on public.projects;
create policy "projects admin insert"
on public.projects
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "projects admin update" on public.projects;
create policy "projects admin update"
on public.projects
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "projects super admin delete" on public.projects;
create policy "projects super admin delete"
on public.projects
for delete
to authenticated
using (public.is_super_admin());

drop policy if exists "invoices scoped access" on public.invoices;
drop policy if exists "invoices scoped select" on public.invoices;
create policy "invoices scoped select"
on public.invoices
for select
to authenticated
using (public.can_access_project(project_id));

drop policy if exists "invoices scoped insert" on public.invoices;
create policy "invoices scoped insert"
on public.invoices
for insert
to authenticated
with check (public.can_access_project(project_id));

drop policy if exists "invoices scoped update" on public.invoices;
create policy "invoices scoped update"
on public.invoices
for update
to authenticated
using (public.can_access_project(project_id))
with check (public.can_access_project(project_id));

drop policy if exists "invoices super admin delete" on public.invoices;
create policy "invoices super admin delete"
on public.invoices
for delete
to authenticated
using (public.is_super_admin());

drop policy if exists "income transactions scoped access" on public.income_transactions;
drop policy if exists "income transactions scoped select" on public.income_transactions;
create policy "income transactions scoped select"
on public.income_transactions
for select
to authenticated
using (public.can_access_project(project_id));

drop policy if exists "income transactions scoped insert" on public.income_transactions;
create policy "income transactions scoped insert"
on public.income_transactions
for insert
to authenticated
with check (public.can_access_project(project_id));

drop policy if exists "income transactions scoped update" on public.income_transactions;
create policy "income transactions scoped update"
on public.income_transactions
for update
to authenticated
using (public.can_access_project(project_id))
with check (public.can_access_project(project_id));

drop policy if exists "income transactions super admin delete" on public.income_transactions;
create policy "income transactions super admin delete"
on public.income_transactions
for delete
to authenticated
using (public.is_super_admin());

grant execute on function public.is_super_admin() to authenticated;
