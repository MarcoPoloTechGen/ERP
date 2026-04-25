alter table public.products
  add column if not exists unit_price_usd numeric(12,2) not null default 0,
  add column if not exists unit_price_iqd numeric(12,2) not null default 0;

update public.products
set
  unit_price_usd = case when currency = 'USD' then coalesce(unit_price, 0) else unit_price_usd end,
  unit_price_iqd = case when currency = 'IQD' then coalesce(unit_price, 0) else unit_price_iqd end
where coalesce(unit_price, 0) <> 0
  and unit_price_usd = 0
  and unit_price_iqd = 0;

alter table public.invoices
  add column if not exists total_amount_usd numeric(12,2) not null default 0,
  add column if not exists paid_amount_usd numeric(12,2) not null default 0,
  add column if not exists total_amount_iqd numeric(12,2) not null default 0,
  add column if not exists paid_amount_iqd numeric(12,2) not null default 0;

update public.invoices
set
  total_amount_usd = case when currency = 'USD' then total_amount else total_amount_usd end,
  paid_amount_usd = case when currency = 'USD' then paid_amount else paid_amount_usd end,
  total_amount_iqd = case when currency = 'IQD' then total_amount else total_amount_iqd end,
  paid_amount_iqd = case when currency = 'IQD' then paid_amount else paid_amount_iqd end
where coalesce(total_amount, 0) <> 0
  and total_amount_usd = 0
  and total_amount_iqd = 0;

alter table public.worker_transactions
  add column if not exists amount_usd numeric(12,2) not null default 0,
  add column if not exists amount_iqd numeric(12,2) not null default 0;

update public.worker_transactions
set
  amount_usd = case when currency = 'USD' then amount else amount_usd end,
  amount_iqd = case when currency = 'IQD' then amount else amount_iqd end
where coalesce(amount, 0) <> 0
  and amount_usd = 0
  and amount_iqd = 0;

alter table public.workers
  add column if not exists balance_usd numeric(12,2) not null default 0,
  add column if not exists balance_iqd numeric(12,2) not null default 0;

alter table public.income_transactions
  add column if not exists amount_usd numeric(12,2) not null default 0,
  add column if not exists amount_iqd numeric(12,2) not null default 0;

update public.income_transactions
set
  amount_usd = case when currency = 'USD' then amount else amount_usd end,
  amount_iqd = case when currency = 'IQD' then amount else amount_iqd end
where coalesce(amount, 0) <> 0
  and amount_usd = 0
  and amount_iqd = 0;

alter table public.invoice_history
  add column if not exists total_amount_usd numeric(12,2) not null default 0,
  add column if not exists paid_amount_usd numeric(12,2) not null default 0,
  add column if not exists total_amount_iqd numeric(12,2) not null default 0,
  add column if not exists paid_amount_iqd numeric(12,2) not null default 0;

update public.invoice_history
set
  total_amount_usd = case when currency = 'USD' then total_amount else total_amount_usd end,
  paid_amount_usd = case when currency = 'USD' then paid_amount else paid_amount_usd end,
  total_amount_iqd = case when currency = 'IQD' then total_amount else total_amount_iqd end,
  paid_amount_iqd = case when currency = 'IQD' then paid_amount else paid_amount_iqd end
where coalesce(total_amount, 0) <> 0
  and total_amount_usd = 0
  and total_amount_iqd = 0;

alter table public.income_transaction_history
  add column if not exists amount_usd numeric(12,2) not null default 0,
  add column if not exists amount_iqd numeric(12,2) not null default 0;

update public.income_transaction_history
set
  amount_usd = case when currency = 'USD' then amount else amount_usd end,
  amount_iqd = case when currency = 'IQD' then amount else amount_iqd end
where coalesce(amount, 0) <> 0
  and amount_usd = 0
  and amount_iqd = 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'products_dual_currency_non_negative'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_dual_currency_non_negative
      check (unit_price_usd >= 0 and unit_price_iqd >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'invoices_dual_currency_non_negative'
      and conrelid = 'public.invoices'::regclass
  ) then
    alter table public.invoices
      add constraint invoices_dual_currency_non_negative
      check (
        total_amount_usd >= 0
        and paid_amount_usd >= 0
        and paid_amount_usd <= total_amount_usd
        and total_amount_iqd >= 0
        and paid_amount_iqd >= 0
        and paid_amount_iqd <= total_amount_iqd
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'worker_transactions_dual_currency_positive'
      and conrelid = 'public.worker_transactions'::regclass
  ) then
    alter table public.worker_transactions
      add constraint worker_transactions_dual_currency_positive
      check (amount_usd >= 0 and amount_iqd >= 0 and (amount_usd > 0 or amount_iqd > 0));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'workers_dual_currency_balance_non_null'
      and conrelid = 'public.workers'::regclass
  ) then
    alter table public.workers
      add constraint workers_dual_currency_balance_non_null
      check (balance_usd is not null and balance_iqd is not null);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'income_transactions_dual_currency_positive'
      and conrelid = 'public.income_transactions'::regclass
  ) then
    alter table public.income_transactions
      add constraint income_transactions_dual_currency_positive
      check (amount_usd >= 0 and amount_iqd >= 0 and (amount_usd > 0 or amount_iqd > 0));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'invoice_history_dual_currency_non_negative'
      and conrelid = 'public.invoice_history'::regclass
  ) then
    alter table public.invoice_history
      add constraint invoice_history_dual_currency_non_negative
      check (
        total_amount_usd >= 0
        and paid_amount_usd >= 0
        and paid_amount_usd <= total_amount_usd
        and total_amount_iqd >= 0
        and paid_amount_iqd >= 0
        and paid_amount_iqd <= total_amount_iqd
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'income_transaction_history_dual_currency_positive'
      and conrelid = 'public.income_transaction_history'::regclass
  ) then
    alter table public.income_transaction_history
      add constraint income_transaction_history_dual_currency_positive
      check (amount_usd >= 0 and amount_iqd >= 0 and (amount_usd > 0 or amount_iqd > 0));
  end if;
end
$$;

create or replace function public.sync_worker_balance()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  target_worker_id bigint;
begin
  if tg_op in ('UPDATE', 'DELETE') and old.worker_id is not null then
    target_worker_id := old.worker_id;

    update public.workers
    set
      balance_usd = coalesce(
        (
          select sum(case when wt.type = 'credit' then wt.amount_usd else -wt.amount_usd end)
          from public.worker_transactions as wt
          where wt.worker_id = target_worker_id
        ),
        0
      ),
      balance_iqd = coalesce(
        (
          select sum(case when wt.type = 'credit' then wt.amount_iqd else -wt.amount_iqd end)
          from public.worker_transactions as wt
          where wt.worker_id = target_worker_id
        ),
        0
      ),
      balance = coalesce(
        (
          select sum(case when wt.type = 'credit' then wt.amount_usd else -wt.amount_usd end)
          from public.worker_transactions as wt
          where wt.worker_id = target_worker_id
        ),
        0
      )
    where id = target_worker_id;
  end if;

  if tg_op in ('INSERT', 'UPDATE') and new.worker_id is not null and (tg_op <> 'UPDATE' or new.worker_id is distinct from old.worker_id) then
    target_worker_id := new.worker_id;

    update public.workers
    set
      balance_usd = coalesce(
        (
          select sum(case when wt.type = 'credit' then wt.amount_usd else -wt.amount_usd end)
          from public.worker_transactions as wt
          where wt.worker_id = target_worker_id
        ),
        0
      ),
      balance_iqd = coalesce(
        (
          select sum(case when wt.type = 'credit' then wt.amount_iqd else -wt.amount_iqd end)
          from public.worker_transactions as wt
          where wt.worker_id = target_worker_id
        ),
        0
      ),
      balance = coalesce(
        (
          select sum(case when wt.type = 'credit' then wt.amount_usd else -wt.amount_usd end)
          from public.worker_transactions as wt
          where wt.worker_id = target_worker_id
        ),
        0
      )
    where id = target_worker_id;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_sync_worker_balance on public.worker_transactions;
create trigger trg_sync_worker_balance
after insert or update or delete on public.worker_transactions
for each row execute function public.sync_worker_balance();

update public.workers as w
set
  balance_usd = coalesce(
    (
      select sum(case when wt.type = 'credit' then wt.amount_usd else -wt.amount_usd end)
      from public.worker_transactions as wt
      where wt.worker_id = w.id
    ),
    0
  ),
  balance_iqd = coalesce(
    (
      select sum(case when wt.type = 'credit' then wt.amount_iqd else -wt.amount_iqd end)
      from public.worker_transactions as wt
      where wt.worker_id = w.id
    ),
    0
  ),
  balance = coalesce(
    (
      select sum(case when wt.type = 'credit' then wt.amount_usd else -wt.amount_usd end)
      from public.worker_transactions as wt
      where wt.worker_id = w.id
    ),
    0
  );

create or replace view public.app_products
with (security_invoker = true)
as
select
  pr.id,
  pr.name,
  pr.supplier_id,
  s.name as supplier_name,
  pr.project_id,
  p.name as project_name,
  pr.building_id,
  pb.name as building_name,
  pr.unit,
  pr.unit_price,
  pr.currency,
  pr.created_at,
  pr.unit_price_usd,
  pr.unit_price_iqd
from public.products as pr
left join public.suppliers as s
  on s.id = pr.supplier_id
left join public.projects as p
  on p.id = pr.project_id
left join public.project_buildings as pb
  on pb.id = pr.building_id;

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
  wt.amount_iqd
from public.worker_transactions as wt
left join public.projects as p
  on p.id = wt.project_id;

create or replace view public.app_income_transactions
with (security_invoker = true)
as
select
  it.id,
  it.project_id,
  p.name as project_name,
  it.amount,
  it.currency,
  it.description,
  it.date,
  it.created_by,
  coalesce(created_profile.full_name, created_profile.email) as created_by_name,
  it.created_at,
  it.record_status,
  it.deleted_at,
  it.deleted_by,
  it.amount_usd,
  it.amount_iqd
from public.income_transactions as it
left join public.projects as p
  on p.id = it.project_id
left join public.profiles as created_profile
  on created_profile.id = it.created_by;

create or replace view public.app_invoices
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

create or replace function public.log_income_transaction_history()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  actor_id uuid;
  actor_name text;
  snapshot_project_name text;
  snapshot_change_type text;
begin
  if tg_op = 'UPDATE' and new is not distinct from old then
    return new;
  end if;

  if tg_op = 'INSERT' then
    actor_id := coalesce(auth.uid(), new.created_by);
    snapshot_change_type := 'created';
  else
    actor_id := coalesce(auth.uid(), new.deleted_by, new.created_by, old.created_by);
    snapshot_change_type := case
      when new.record_status = 'deleted' and old.record_status is distinct from new.record_status then 'deleted'
      else 'updated'
    end;
  end if;

  if actor_id is not null then
    select coalesce(p.full_name, p.email)
    into actor_name
    from public.profiles as p
    where p.id = actor_id;
  end if;

  if new.project_id is not null then
    select p.name
    into snapshot_project_name
    from public.projects as p
    where p.id = new.project_id;
  end if;

  insert into public.income_transaction_history (
    income_transaction_id,
    change_type,
    project_id,
    project_name,
    amount,
    currency,
    amount_usd,
    amount_iqd,
    description,
    date,
    record_status,
    changed_by,
    changed_by_name,
    changed_at
  )
  values (
    new.id,
    snapshot_change_type,
    new.project_id,
    snapshot_project_name,
    new.amount,
    new.currency,
    new.amount_usd,
    new.amount_iqd,
    new.description,
    new.date,
    new.record_status,
    actor_id,
    actor_name,
    case when tg_op = 'INSERT' then coalesce(new.created_at, now()) else now() end
  );

  return new;
end;
$$;

create or replace view public.app_income_transaction_history
with (security_invoker = true)
as
select
  ith.id,
  ith.income_transaction_id,
  ith.change_type,
  ith.project_id,
  ith.project_name,
  ith.amount,
  ith.currency,
  ith.description,
  ith.date,
  ith.record_status,
  ith.changed_by,
  ith.changed_by_name,
  ith.changed_at,
  ith.amount_usd,
  ith.amount_iqd
from public.income_transaction_history as ith;

create or replace function public.get_dashboard_overview()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
with visible_projects as (
  select id, name, status
  from public.projects
),
visible_invoices as (
  select
    id,
    number,
    status,
    supplier_name,
    project_name,
    project_id,
    total_amount,
    paid_amount,
    remaining_amount,
    total_amount_usd,
    paid_amount_usd,
    remaining_amount_usd,
    total_amount_iqd,
    paid_amount_iqd,
    remaining_amount_iqd
  from public.app_invoices
  where record_status = 'active'
),
visible_workers as (
  select id, name, role, balance, balance_usd, balance_iqd
  from public.workers
),
visible_transactions as (
  select worker_id, type, amount, amount_usd, amount_iqd
  from public.worker_transactions
),
project_summaries as (
  select
    p.id,
    p.name,
    p.status,
    count(i.id)::int as invoice_count,
    coalesce(sum(i.total_amount), 0)::numeric(12,2) as total_invoiced,
    coalesce(sum(i.paid_amount), 0)::numeric(12,2) as total_paid,
    coalesce(sum(i.remaining_amount), 0)::numeric(12,2) as remaining,
    coalesce(sum(i.total_amount_usd), 0)::numeric(12,2) as total_invoiced_usd,
    coalesce(sum(i.paid_amount_usd), 0)::numeric(12,2) as total_paid_usd,
    coalesce(sum(i.remaining_amount_usd), 0)::numeric(12,2) as remaining_usd,
    coalesce(sum(i.total_amount_iqd), 0)::numeric(12,2) as total_invoiced_iqd,
    coalesce(sum(i.paid_amount_iqd), 0)::numeric(12,2) as total_paid_iqd,
    coalesce(sum(i.remaining_amount_iqd), 0)::numeric(12,2) as remaining_iqd
  from visible_projects as p
  left join visible_invoices as i
    on i.project_id = p.id
  group by p.id, p.name, p.status
),
worker_summaries as (
  select
    w.id,
    w.name,
    w.role,
    w.balance,
    w.balance_usd,
    w.balance_iqd,
    coalesce(sum(case when wt.type = 'credit' then wt.amount else 0 end), 0)::numeric(12,2) as total_credit,
    coalesce(sum(case when wt.type = 'debit' then wt.amount else 0 end), 0)::numeric(12,2) as total_debit,
    coalesce(sum(case when wt.type = 'credit' then wt.amount_usd else 0 end), 0)::numeric(12,2) as total_credit_usd,
    coalesce(sum(case when wt.type = 'debit' then wt.amount_usd else 0 end), 0)::numeric(12,2) as total_debit_usd,
    coalesce(sum(case when wt.type = 'credit' then wt.amount_iqd else 0 end), 0)::numeric(12,2) as total_credit_iqd,
    coalesce(sum(case when wt.type = 'debit' then wt.amount_iqd else 0 end), 0)::numeric(12,2) as total_debit_iqd
  from visible_workers as w
  left join visible_transactions as wt
    on wt.worker_id = w.id
  group by w.id, w.name, w.role, w.balance, w.balance_usd, w.balance_iqd
),
invoice_summaries as (
  select
    id,
    number,
    status,
    supplier_name,
    project_name,
    total_amount,
    paid_amount,
    remaining_amount as remaining,
    total_amount_usd,
    paid_amount_usd,
    remaining_amount_usd as remaining_usd,
    total_amount_iqd,
    paid_amount_iqd,
    remaining_amount_iqd as remaining_iqd
  from visible_invoices
)
select jsonb_build_object(
  'totalWorkers',
  (select count(*) from visible_workers),
  'activeProjects',
  (select count(*) from visible_projects where status = 'active'),
  'totalSuppliers',
  (select count(*) from public.suppliers),
  'invoicesUnpaid',
  (select count(*) from visible_invoices where status <> 'paid'),
  'totalInvoiceAmount',
  coalesce((select sum(total_amount) from visible_invoices), 0),
  'totalPaidAmount',
  coalesce((select sum(paid_amount) from visible_invoices), 0),
  'remainingAmount',
  coalesce((select sum(remaining_amount) from visible_invoices), 0),
  'totalInvoiceAmountUsd',
  coalesce((select sum(total_amount_usd) from visible_invoices), 0),
  'totalPaidAmountUsd',
  coalesce((select sum(paid_amount_usd) from visible_invoices), 0),
  'remainingAmountUsd',
  coalesce((select sum(remaining_amount_usd) from visible_invoices), 0),
  'totalInvoiceAmountIqd',
  coalesce((select sum(total_amount_iqd) from visible_invoices), 0),
  'totalPaidAmountIqd',
  coalesce((select sum(paid_amount_iqd) from visible_invoices), 0),
  'remainingAmountIqd',
  coalesce((select sum(remaining_amount_iqd) from visible_invoices), 0),
  'projectsSummary',
  coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', ps.id,
          'name', ps.name,
          'status', ps.status,
          'invoiceCount', ps.invoice_count,
          'totalInvoiced', ps.total_invoiced,
          'totalPaid', ps.total_paid,
          'remaining', ps.remaining,
          'totalInvoicedUsd', ps.total_invoiced_usd,
          'totalPaidUsd', ps.total_paid_usd,
          'remainingUsd', ps.remaining_usd,
          'totalInvoicedIqd', ps.total_invoiced_iqd,
          'totalPaidIqd', ps.total_paid_iqd,
          'remainingIqd', ps.remaining_iqd
        )
        order by ps.remaining_usd desc, ps.remaining_iqd desc, ps.name asc
      )
      from project_summaries as ps
    ),
    '[]'::jsonb
  ),
  'workersSummary',
  coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', ws.id,
          'name', ws.name,
          'role', ws.role,
          'balance', ws.balance,
          'balanceUsd', ws.balance_usd,
          'balanceIqd', ws.balance_iqd,
          'totalCredit', ws.total_credit,
          'totalDebit', ws.total_debit,
          'totalCreditUsd', ws.total_credit_usd,
          'totalDebitUsd', ws.total_debit_usd,
          'totalCreditIqd', ws.total_credit_iqd,
          'totalDebitIqd', ws.total_debit_iqd
        )
        order by abs(ws.balance_usd) desc, abs(ws.balance_iqd) desc, ws.name asc
      )
      from worker_summaries as ws
    ),
    '[]'::jsonb
  ),
  'invoicesSummary',
  coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', inv.id,
          'number', inv.number,
          'status', inv.status,
          'supplierName', inv.supplier_name,
          'projectName', inv.project_name,
          'totalAmount', inv.total_amount,
          'paidAmount', inv.paid_amount,
          'remaining', inv.remaining,
          'totalAmountUsd', inv.total_amount_usd,
          'paidAmountUsd', inv.paid_amount_usd,
          'remainingUsd', inv.remaining_usd,
          'totalAmountIqd', inv.total_amount_iqd,
          'paidAmountIqd', inv.paid_amount_iqd,
          'remainingIqd', inv.remaining_iqd
        )
        order by inv.remaining_usd desc, inv.remaining_iqd desc, inv.number asc
      )
      from invoice_summaries as inv
    ),
    '[]'::jsonb
  )
);
$$;
