create table if not exists public.app_settings (
  id text primary key default 'default' check (id = 'default'),
  company_logo_path text,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (id)
values ('default')
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('branding-assets', 'branding-assets', true)
on conflict (id) do update
set public = true;

alter table public.app_settings enable row level security;

drop policy if exists "app settings public read" on public.app_settings;
create policy "app settings public read"
on public.app_settings
for select
to anon, authenticated
using (true);

drop policy if exists "app settings admin write" on public.app_settings;
create policy "app settings admin write"
on public.app_settings
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "branding assets admin insert" on storage.objects;
create policy "branding assets admin insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'branding-assets'
  and public.is_admin()
);

drop policy if exists "branding assets admin update" on storage.objects;
create policy "branding assets admin update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'branding-assets'
  and public.is_admin()
)
with check (
  bucket_id = 'branding-assets'
  and public.is_admin()
);

drop policy if exists "branding assets admin delete" on storage.objects;
create policy "branding assets admin delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'branding-assets'
  and public.is_admin()
);

grant usage on schema public to anon;
grant select on public.app_settings to anon;
grant select on public.app_settings to authenticated;
