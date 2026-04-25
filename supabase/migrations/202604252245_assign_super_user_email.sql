do $$
begin
  if exists (
    select 1
    from public.profiles as p
    where lower(coalesce(p.email, '')) = 'omer.ali.mahmoud@hotmail.com'
  ) then
    update public.profiles
    set role = 'admin'
    where role = 'super_admin'
      and lower(coalesce(email, '')) <> 'omer.ali.mahmoud@hotmail.com';

    update public.profiles
    set role = 'super_admin'
    where lower(coalesce(email, '')) = 'omer.ali.mahmoud@hotmail.com';
  end if;
end
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  super_user_email constant text := 'omer.ali.mahmoud@hotmail.com';
  assigned_role text := 'user';
begin
  if lower(coalesce(new.email, '')) = super_user_email then
    assigned_role := 'super_admin';
  elsif not exists (select 1 from public.profiles) then
    assigned_role := 'admin';
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''), assigned_role)
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    role = case
      when lower(coalesce(excluded.email, '')) = super_user_email then 'super_admin'
      else public.profiles.role
    end;

  if assigned_role = 'super_admin' then
    update public.profiles
    set role = 'admin'
    where id <> new.id
      and role = 'super_admin';
  end if;

  return new;
end;
$$;
