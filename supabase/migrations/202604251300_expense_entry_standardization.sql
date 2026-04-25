alter table public.invoices
  drop constraint if exists invoices_number_key;

drop index if exists public.invoices_number_key;

alter table public.invoices
  add column if not exists expense_type text not null default 'products',
  add column if not exists labor_person_name text;

alter table public.invoice_history
  add column if not exists expense_type text not null default 'products',
  add column if not exists labor_person_name text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'invoices_expense_type_check'
      and conrelid = 'public.invoices'::regclass
  ) then
    alter table public.invoices
      add constraint invoices_expense_type_check
      check (expense_type in ('labor', 'products', 'logistics'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'invoice_history_expense_type_check'
      and conrelid = 'public.invoice_history'::regclass
  ) then
    alter table public.invoice_history
      add constraint invoice_history_expense_type_check
      check (expense_type in ('labor', 'products', 'logistics'));
  end if;
end
$$;

drop view if exists public.app_invoice_history;
drop view if exists public.app_invoices;

create or replace view public.app_invoices
with (security_invoker = true)
as
select
  i.id,
  i.number,
  i.expense_type,
  i.labor_person_name,
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
  i.created_at,
  i.record_status,
  i.deleted_at,
  i.deleted_by,
  i.total_amount_usd,
  i.paid_amount_usd,
  greatest(i.total_amount_usd - i.paid_amount_usd, 0) as remaining_amount_usd,
  i.total_amount_iqd,
  i.paid_amount_iqd,
  greatest(i.total_amount_iqd - i.paid_amount_iqd, 0) as remaining_amount_iqd
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
    expense_type,
    labor_person_name,
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
    total_amount_usd,
    paid_amount_usd,
    total_amount_iqd,
    paid_amount_iqd,
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
    new.expense_type,
    new.labor_person_name,
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
    new.total_amount_usd,
    new.paid_amount_usd,
    new.total_amount_iqd,
    new.paid_amount_iqd,
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

create or replace view public.app_invoice_history
with (security_invoker = true)
as
select
  ih.id,
  ih.invoice_id,
  ih.change_type,
  ih.number,
  ih.expense_type,
  ih.labor_person_name,
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
  ih.changed_at,
  ih.total_amount_usd,
  ih.paid_amount_usd,
  greatest(ih.total_amount_usd - ih.paid_amount_usd, 0) as remaining_amount_usd,
  ih.total_amount_iqd,
  ih.paid_amount_iqd,
  greatest(ih.total_amount_iqd - ih.paid_amount_iqd, 0) as remaining_amount_iqd
from public.invoice_history as ih;

grant select on public.app_invoices to authenticated;
grant select on public.app_invoice_history to authenticated;
