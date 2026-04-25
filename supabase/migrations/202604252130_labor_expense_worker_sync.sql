alter table public.invoices
  add column if not exists labor_worker_id bigint;

alter table public.invoice_history
  add column if not exists labor_worker_id bigint,
  add column if not exists labor_worker_name text;

alter table public.worker_transactions
  add column if not exists source_invoice_id bigint,
  add column if not exists source_kind text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'invoices_labor_worker_id_fkey'
      and conrelid = 'public.invoices'::regclass
  ) then
    alter table public.invoices
      add constraint invoices_labor_worker_id_fkey
      foreign key (labor_worker_id)
      references public.workers(id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'invoice_history_labor_worker_id_fkey'
      and conrelid = 'public.invoice_history'::regclass
  ) then
    alter table public.invoice_history
      add constraint invoice_history_labor_worker_id_fkey
      foreign key (labor_worker_id)
      references public.workers(id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'worker_transactions_source_invoice_id_fkey'
      and conrelid = 'public.worker_transactions'::regclass
  ) then
    alter table public.worker_transactions
      add constraint worker_transactions_source_invoice_id_fkey
      foreign key (source_invoice_id)
      references public.invoices(id)
      on delete cascade;
  end if;
end
$$;

create index if not exists idx_invoices_labor_worker_id on public.invoices(labor_worker_id);
create index if not exists idx_invoice_history_labor_worker_id on public.invoice_history(labor_worker_id);
create index if not exists idx_worker_transactions_source_invoice_id
  on public.worker_transactions(source_invoice_id);

create unique index if not exists idx_worker_transactions_labor_expense_source
  on public.worker_transactions(source_invoice_id, type)
  where source_kind = 'labor_expense';

drop view if exists public.app_invoice_history;
drop view if exists public.app_invoices;
drop view if exists public.app_worker_transactions;

create or replace view public.app_worker_transactions
with (security_invoker = true)
as
select
  wt.id,
  wt.worker_id,
  wt.project_id,
  p.name as project_name,
  wt.type,
  wt.amount,
  wt.currency,
  wt.description,
  wt.date,
  wt.created_at,
  wt.amount_usd,
  wt.amount_iqd,
  wt.source_invoice_id,
  wt.source_kind
from public.worker_transactions as wt
left join public.projects as p
  on p.id = wt.project_id;

create or replace view public.app_invoices
with (security_invoker = true)
as
select
  i.id,
  i.number,
  i.expense_type,
  i.labor_person_name,
  i.labor_worker_id,
  lw.name as labor_worker_name,
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
left join public.workers as lw
  on lw.id = i.labor_worker_id
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
  snapshot_labor_worker_name text;
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

  if new.labor_worker_id is not null then
    select w.name
    into snapshot_labor_worker_name
    from public.workers as w
    where w.id = new.labor_worker_id;
  end if;

  insert into public.invoice_history (
    invoice_id,
    change_type,
    number,
    expense_type,
    labor_worker_id,
    labor_worker_name,
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
    new.labor_worker_id,
    snapshot_labor_worker_name,
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
  ih.labor_worker_id,
  ih.labor_worker_name,
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

create or replace function public.sync_labor_invoice_worker_transactions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  source_title text;
  source_date date;
  credit_amount numeric;
  credit_currency text;
  debit_amount numeric;
  debit_currency text;
begin
  if tg_op = 'DELETE' then
    delete from public.worker_transactions
    where source_kind = 'labor_expense'
      and source_invoice_id = old.id;

    return old;
  end if;

  if tg_op = 'UPDATE'
    and old.expense_type = 'labor'
    and old.labor_worker_id is not null
    and (
      new.expense_type is distinct from 'labor'
      or new.record_status is distinct from 'active'
      or new.labor_worker_id is null
      or new.labor_worker_id is distinct from old.labor_worker_id
    )
  then
    delete from public.worker_transactions
    where source_kind = 'labor_expense'
      and source_invoice_id = old.id;
  end if;

  if new.expense_type <> 'labor'
    or new.record_status <> 'active'
    or new.labor_worker_id is null
  then
    return new;
  end if;

  source_title := coalesce(nullif(new.number, ''), 'Labor expense');
  source_date := coalesce(new.invoice_date, current_date);
  credit_amount := case
    when coalesce(new.total_amount_usd, 0) > 0 then coalesce(new.total_amount_usd, 0)
    else coalesce(new.total_amount_iqd, 0)
  end;
  credit_currency := case
    when coalesce(new.total_amount_usd, 0) > 0 then 'USD'
    else 'IQD'
  end;
  debit_amount := case
    when coalesce(new.paid_amount_usd, 0) > 0 then coalesce(new.paid_amount_usd, 0)
    else coalesce(new.paid_amount_iqd, 0)
  end;
  debit_currency := case
    when coalesce(new.paid_amount_usd, 0) > 0 then 'USD'
    else 'IQD'
  end;

  if coalesce(new.total_amount_usd, 0) > 0 or coalesce(new.total_amount_iqd, 0) > 0 then
    insert into public.worker_transactions (
      worker_id,
      project_id,
      type,
      amount,
      currency,
      amount_usd,
      amount_iqd,
      description,
      date,
      source_invoice_id,
      source_kind
    )
    values (
      new.labor_worker_id,
      new.project_id,
      'credit',
      credit_amount,
      credit_currency,
      coalesce(new.total_amount_usd, 0),
      coalesce(new.total_amount_iqd, 0),
      'Labor earned: ' || source_title,
      source_date,
      new.id,
      'labor_expense'
    )
    on conflict (source_invoice_id, type) where (source_kind = 'labor_expense')
    do update set
      worker_id = excluded.worker_id,
      project_id = excluded.project_id,
      amount = excluded.amount,
      currency = excluded.currency,
      amount_usd = excluded.amount_usd,
      amount_iqd = excluded.amount_iqd,
      description = excluded.description,
      date = excluded.date,
      source_kind = excluded.source_kind;
  else
    delete from public.worker_transactions
    where source_kind = 'labor_expense'
      and source_invoice_id = new.id
      and type = 'credit';
  end if;

  if coalesce(new.paid_amount_usd, 0) > 0 or coalesce(new.paid_amount_iqd, 0) > 0 then
    insert into public.worker_transactions (
      worker_id,
      project_id,
      type,
      amount,
      currency,
      amount_usd,
      amount_iqd,
      description,
      date,
      source_invoice_id,
      source_kind
    )
    values (
      new.labor_worker_id,
      new.project_id,
      'debit',
      debit_amount,
      debit_currency,
      coalesce(new.paid_amount_usd, 0),
      coalesce(new.paid_amount_iqd, 0),
      'Labor paid: ' || source_title,
      source_date,
      new.id,
      'labor_expense'
    )
    on conflict (source_invoice_id, type) where (source_kind = 'labor_expense')
    do update set
      worker_id = excluded.worker_id,
      project_id = excluded.project_id,
      amount = excluded.amount,
      currency = excluded.currency,
      amount_usd = excluded.amount_usd,
      amount_iqd = excluded.amount_iqd,
      description = excluded.description,
      date = excluded.date,
      source_kind = excluded.source_kind;
  else
    delete from public.worker_transactions
    where source_kind = 'labor_expense'
      and source_invoice_id = new.id
      and type = 'debit';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_labor_invoice_worker_transactions on public.invoices;
create trigger trg_sync_labor_invoice_worker_transactions
after insert or update or delete on public.invoices
for each row execute function public.sync_labor_invoice_worker_transactions();

grant select on public.app_worker_transactions to authenticated;
grant select on public.app_invoices to authenticated;
grant select on public.app_invoice_history to authenticated;
