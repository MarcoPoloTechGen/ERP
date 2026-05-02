alter table public.workers
  alter column role drop not null;

alter table public.specialities enable row level security;

drop policy if exists "Allow insert for authenticated users" on public.specialities;
drop policy if exists "Allow update for authenticated users" on public.specialities;
drop policy if exists "Allow delete for authenticated users" on public.specialities;

create policy "Allow insert for authenticated users" on public.specialities
  for insert with check (auth.role() = 'authenticated');

create policy "Allow update for authenticated users" on public.specialities
  for update using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Allow delete for authenticated users" on public.specialities
  for delete using (auth.role() = 'authenticated');
