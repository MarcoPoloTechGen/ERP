create table if not exists public.supplier_products (
  supplier_id integer not null references public.suppliers(id) on delete cascade,
  product_id integer not null references public.materials(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (supplier_id, product_id)
);

insert into public.supplier_products (supplier_id, product_id)
select supplier_id, id
from public.materials
where supplier_id is not null
on conflict do nothing;

update public.materials
set supplier_id = null
where supplier_id is not null;

alter table public.supplier_products enable row level security;

drop policy if exists "Allow read access for all users" on public.supplier_products;
create policy "Allow read access for all users" on public.supplier_products
  for select using (true);

drop policy if exists "Allow insert for authenticated users" on public.supplier_products;
create policy "Allow insert for authenticated users" on public.supplier_products
  for insert with check (auth.role() = 'authenticated');

drop policy if exists "Allow update for authenticated users" on public.supplier_products;
create policy "Allow update for authenticated users" on public.supplier_products
  for update using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "Allow delete for authenticated users" on public.supplier_products;
create policy "Allow delete for authenticated users" on public.supplier_products
  for delete using (auth.role() = 'authenticated');

grant select, insert, update, delete on public.supplier_products to authenticated;

create or replace view public.app_products
with (security_invoker = true)
as
select
  m.id,
  m.name,
  null::integer as supplier_id,
  string_agg(s.name, ', ' order by s.name) as supplier_name,
  m.project_id,
  p.name as project_name,
  m.building_id,
  pb.name as building_name,
  m.unit,
  m.unit_price,
  m.currency,
  coalesce(m.unit_price_usd, case when m.currency = 'USD' then m.unit_price else 0 end, 0)::numeric as unit_price_usd,
  coalesce(m.unit_price_iqd, case when m.currency = 'IQD' then m.unit_price else 0 end, 0)::numeric as unit_price_iqd,
  m.notes,
  m.created_at,
  array_remove(array_agg(sp.supplier_id order by s.name), null)::integer[] as supplier_ids,
  array_remove(array_agg(s.name order by s.name), null)::text[] as supplier_names
from public.materials as m
left join public.supplier_products as sp
  on sp.product_id = m.id
left join public.suppliers as s
  on s.id = sp.supplier_id
left join public.projects as p
  on p.id = m.project_id
left join public.project_buildings as pb
  on pb.id = m.building_id
group by
  m.id,
  m.name,
  m.project_id,
  p.name,
  m.building_id,
  pb.name,
  m.unit,
  m.unit_price,
  m.currency,
  m.unit_price_usd,
  m.unit_price_iqd,
  m.notes,
  m.created_at;

grant select on public.app_products to authenticated;
