do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'invoices'
      and column_name = 'image_url'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'invoices'
      and column_name = 'image_path'
  ) then
    alter table public.invoices rename column image_url to image_path;
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'invoice_history'
      and column_name = 'image_url'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'invoice_history'
      and column_name = 'image_path'
  ) then
    alter table public.invoice_history rename column image_url to image_path;
  end if;
end
$$;

update public.invoices
set invoice_date = coalesce(invoice_date, created_at::date, current_date)
where invoice_date is null;

alter table public.invoices
  alter column invoice_date set default current_date;

alter table public.invoices
  alter column invoice_date set not null;

create or replace function public.log_invoice_history()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  actor_id uuid;
  actor_name text;
  snapshot_supplier_name text;
  snapshot_project_name text;
  snapshot_building_name text;
  snapshot_product_name text;
begin
  if tg_op = 'UPDATE' and new is not distinct from old then
    return new;
  end if;

  if tg_op = 'INSERT' then
    actor_id := coalesce(auth.uid(), new.created_by);
  else
    actor_id := coalesce(auth.uid(), new.created_by, old.created_by);
  end if;

  if actor_id is not null then
    select coalesce(p.full_name, p.email)
    into actor_name
    from public.profiles as p
    where p.id = actor_id;
  end if;

  if new.supplier_id is not null then
    select s.name
    into snapshot_supplier_name
    from public.suppliers as s
    where s.id = new.supplier_id;
  end if;

  if new.project_id is not null then
    select p.name
    into snapshot_project_name
    from public.projects as p
    where p.id = new.project_id;
  end if;

  if new.building_id is not null then
    select pb.name
    into snapshot_building_name
    from public.project_buildings as pb
    where pb.id = new.building_id;
  end if;

  if new.product_id is not null then
    select pr.name
    into snapshot_product_name
    from public.products as pr
    where pr.id = new.product_id;
  end if;

  insert into public.invoice_history (
    invoice_id,
    change_type,
    number,
    supplier_id,
    supplier_name,
    project_id,
    project_name,
    building_id,
    building_name,
    product_id,
    product_name,
    total_amount,
    paid_amount,
    currency,
    status,
    invoice_date,
    due_date,
    notes,
    image_path,
    changed_by,
    changed_by_name,
    changed_at
  )
  values (
    new.id,
    case when tg_op = 'INSERT' then 'created' else 'updated' end,
    new.number,
    new.supplier_id,
    snapshot_supplier_name,
    new.project_id,
    snapshot_project_name,
    new.building_id,
    snapshot_building_name,
    new.product_id,
    snapshot_product_name,
    new.total_amount,
    new.paid_amount,
    new.currency,
    new.status,
    new.invoice_date,
    new.due_date,
    new.notes,
    new.image_path,
    actor_id,
    actor_name,
    case when tg_op = 'INSERT' then coalesce(new.created_at, now()) else now() end
  );

  return new;
end;
$$;

drop view if exists public.app_invoice_history;
drop view if exists public.app_invoices;

create view public.app_invoices
with (security_invoker = true)
as
select
  i.id,
  i.number,
  i.status,
  i.supplier_id,
  s.name as supplier_name,
  i.project_id,
  p.name as project_name,
  i.building_id,
  pb.name as building_name,
  i.product_id,
  pr.name as product_name,
  i.total_amount,
  i.paid_amount,
  greatest(i.total_amount - i.paid_amount, 0) as remaining_amount,
  i.currency,
  i.invoice_date,
  i.due_date,
  i.notes,
  i.image_path,
  i.created_by,
  coalesce(created_profile.full_name, created_profile.email) as created_by_name,
  i.created_at
from public.invoices as i
left join public.suppliers as s
  on s.id = i.supplier_id
left join public.projects as p
  on p.id = i.project_id
left join public.project_buildings as pb
  on pb.id = i.building_id
left join public.products as pr
  on pr.id = i.product_id
left join public.profiles as created_profile
  on created_profile.id = i.created_by;

create view public.app_invoice_history
with (security_invoker = true)
as
select
  ih.id,
  ih.invoice_id,
  ih.change_type,
  ih.number,
  ih.status,
  ih.supplier_id,
  ih.supplier_name,
  ih.project_id,
  ih.project_name,
  ih.building_id,
  ih.building_name,
  ih.product_id,
  ih.product_name,
  ih.total_amount,
  ih.paid_amount,
  greatest(ih.total_amount - ih.paid_amount, 0) as remaining_amount,
  ih.currency,
  ih.invoice_date,
  ih.due_date,
  ih.notes,
  ih.image_path,
  ih.changed_by,
  ih.changed_by_name,
  ih.changed_at
from public.invoice_history as ih;
