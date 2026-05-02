-- Reconnect the React app to the current normalized Supabase schema.
-- The app still reads app_* resources, while the database now stores the
-- business data in workers/suppliers/projects/materials/party_transactions.

alter table public.workers
  add column if not exists role text,
  add column if not exists category text;

alter table public.suppliers
  add column if not exists contact text;

alter table public.projects
  add column if not exists budget numeric;

alter table public.project_buildings
  add column if not exists is_default boolean not null default false;

alter table public.materials
  add column if not exists supplier_id integer references public.suppliers(id) on delete set null,
  add column if not exists project_id integer references public.projects(id) on delete set null,
  add column if not exists building_id bigint references public.project_buildings(id) on delete set null,
  add column if not exists unit text,
  add column if not exists unit_price numeric,
  add column if not exists currency text not null default 'USD',
  add column if not exists unit_price_usd numeric not null default 0,
  add column if not exists unit_price_iqd numeric not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'materials_currency_check'
      and conrelid = 'public.materials'::regclass
  ) then
    alter table public.materials
      add constraint materials_currency_check check (currency in ('USD', 'IQD'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'materials_unit_price_check'
      and conrelid = 'public.materials'::regclass
  ) then
    alter table public.materials
      add constraint materials_unit_price_check check (
        (unit_price is null or unit_price >= 0)
        and unit_price_usd >= 0
        and unit_price_iqd >= 0
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'projects_budget_check'
      and conrelid = 'public.projects'::regclass
  ) then
    alter table public.projects
      add constraint projects_budget_check check (budget is null or budget >= 0);
  end if;
end $$;

insert into public.project_buildings (project_id, name, is_default)
select p.id, 'تێچوی گشتی ', true
from public.projects as p
where not exists (
  select 1
  from public.project_buildings as pb
  where pb.project_id = p.id
    and pb.is_default = true
);

create or replace function public.replace_project_buildings(
  p_project_id bigint,
  p_building_names text[]
)
returns void
language plpgsql
set search_path to 'public'
as $function$
declare
  cleaned_names text[];
begin
  if not public.is_admin() then
    raise exception 'Only administrators can update project buildings.';
  end if;

  cleaned_names := array(
    select distinct trimmed_name
    from (
      select nullif(btrim(name), '') as trimmed_name
      from unnest(coalesce(p_building_names, array[]::text[])) as name
    ) as prepared_names
    where trimmed_name is not null
    order by trimmed_name
  );

  insert into public.project_buildings (project_id, name, is_default)
  select p_project_id, 'تێچوی گشتی ', true
  where not exists (
    select 1
    from public.project_buildings
    where project_id = p_project_id
      and is_default = true
  );

  delete from public.project_buildings
  where project_id = p_project_id
    and coalesce(is_default, false) = false;

  insert into public.project_buildings (project_id, name, is_default)
  select p_project_id, building_names.name, false
  from unnest(cleaned_names) as building_names(name)
  where not exists (
    select 1
    from public.project_buildings as existing_buildings
    where existing_buildings.project_id = p_project_id
      and lower(existing_buildings.name) = lower(building_names.name)
  );
end;
$function$;

create or replace view public.app_projects
with (security_invoker = true)
as
select
  p.id,
  p.name,
  p.client,
  p.location,
  p.status,
  p.budget,
  p.start_date,
  p.end_date,
  p.created_at,
  p.updated_at,
  count(pb.id)::integer as building_count
from public.projects as p
left join public.project_buildings as pb
  on pb.project_id = p.id
group by p.id;

create or replace view public.app_workers
with (security_invoker = true)
as
select
  w.id,
  w.name,
  w.role,
  w.category,
  w.phone,
  w.notes,
  coalesce(wb.balance_usd, 0)::numeric as balance,
  coalesce(wb.balance_usd, 0)::numeric as balance_usd,
  coalesce(wb.balance_iqd, 0)::numeric as balance_iqd,
  w.created_at,
  w.updated_at
from public.workers as w
left join public.worker_balances as wb
  on wb.worker_id = w.id;

create or replace view public.app_suppliers
with (security_invoker = true)
as
select
  s.id,
  s.name,
  s.contact,
  s.phone,
  s.email,
  s.address,
  coalesce(sb.balance_usd, 0)::numeric as balance_usd,
  coalesce(sb.balance_iqd, 0)::numeric as balance_iqd,
  s.created_at,
  s.updated_at
from public.suppliers as s
left join public.supplier_balances as sb
  on sb.supplier_id = s.id;

create or replace view public.app_products
with (security_invoker = true)
as
select
  m.id,
  m.name,
  m.supplier_id,
  s.name as supplier_name,
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
  m.created_at
from public.materials as m
left join public.suppliers as s
  on s.id = m.supplier_id
left join public.projects as p
  on p.id = m.project_id
left join public.project_buildings as pb
  on pb.id = m.building_id;

create or replace view public.app_income_transactions
with (security_invoker = true)
as
select
  it.id,
  it.project_id,
  p.name as project_name,
  it.amount,
  it.currency,
  case when it.currency = 'USD' then it.amount else 0 end::numeric as amount_usd,
  case when it.currency = 'IQD' then it.amount else 0 end::numeric as amount_iqd,
  it.description,
  it.date,
  case when it.deleted_at is null then 'active' else 'deleted' end::text as record_status,
  it.created_by,
  coalesce(created_profile.full_name, created_profile.email::text) as created_by_name,
  it.deleted_by,
  it.deleted_at,
  it.created_at,
  it.updated_by,
  it.updated_at
from public.income_transactions as it
left join public.projects as p
  on p.id = it.project_id
left join public.profiles as created_profile
  on created_profile.id = it.created_by;

create or replace view public.app_income_transaction_history
with (security_invoker = true)
as
select
  ith.id,
  ith.income_transaction_id,
  case when ith.change_type = 'delete' then 'deleted' else 'updated' end::text as change_type,
  ith.old_project_id as project_id,
  p.name as project_name,
  ith.old_amount as amount,
  ith.old_currency as currency,
  case when ith.old_currency = 'USD' then ith.old_amount else 0 end::numeric as amount_usd,
  case when ith.old_currency = 'IQD' then ith.old_amount else 0 end::numeric as amount_iqd,
  ith.old_description as description,
  ith.old_date as date,
  'active'::text as record_status,
  ith.changed_by,
  coalesce(changed_profile.full_name, changed_profile.email::text) as changed_by_name,
  ith.changed_at
from public.income_transaction_history as ith
left join public.projects as p
  on p.id = ith.old_project_id
left join public.profiles as changed_profile
  on changed_profile.id = ith.changed_by;

create or replace view public.app_party_transactions
with (security_invoker = true)
as
select
  pt.id,
  pt.entity_type as party_type,
  pt.worker_id,
  w.name as worker_name,
  pt.supplier_id,
  s.name as supplier_name,
  case when pt.entry_type = 'debt' then 'credit' else 'debit' end::text as type,
  pt.amount,
  pt.currency,
  case when pt.currency = 'USD' then pt.amount else 0 end::numeric as amount_usd,
  case when pt.currency = 'IQD' then pt.amount else 0 end::numeric as amount_iqd,
  pt.description,
  pt.notes,
  pt.date,
  pb.project_id,
  p.name as project_name,
  pt.building_id,
  pb.name as building_name,
  pt.category_id,
  ec.name as expense_category,
  null::bigint as source_invoice_id,
  null::text as source_kind,
  pt.created_by,
  coalesce(created_profile.full_name, created_profile.email::text) as created_by_name,
  pt.deleted_by,
  pt.deleted_at,
  pt.created_at,
  pt.updated_by,
  pt.updated_at,
  pt.deleted_at is null as can_manage
from public.party_transactions as pt
left join public.workers as w
  on w.id = pt.worker_id
left join public.suppliers as s
  on s.id = pt.supplier_id
left join public.project_buildings as pb
  on pb.id = pt.building_id
left join public.projects as p
  on p.id = pb.project_id
left join public.expense_categories as ec
  on ec.id = pt.category_id
left join public.profiles as created_profile
  on created_profile.id = pt.created_by
where pt.deleted_at is null;

create or replace view public.app_worker_transactions
with (security_invoker = true)
as
select *
from public.app_party_transactions
where party_type = 'worker';

create or replace view public.app_supplier_transactions
with (security_invoker = true)
as
select *
from public.app_party_transactions
where party_type = 'supplier';

create or replace view public.app_invoices
with (security_invoker = true)
as
select
  pt.id,
  coalesce(nullif(pt.description, ''), 'TX-' || pt.id::text) as number,
  case
    when pt.entity_type = 'worker' then 'labor'
    when pt.entity_type = 'supplier' then 'products'
    else 'logistics'
  end::text as expense_type,
  pt.worker_id as labor_worker_id,
  w.name as labor_worker_name,
  w.name as labor_person_name,
  case when pt.entry_type = 'payment' then 'paid' else 'unpaid' end::text as status,
  case when pt.deleted_at is null then 'active' else 'deleted' end::text as record_status,
  pt.supplier_id,
  s.name as supplier_name,
  pb.project_id,
  p.name as project_name,
  pt.building_id,
  pb.name as building_name,
  null::bigint as product_id,
  ec.name as product_name,
  pt.amount as total_amount,
  case when pt.entry_type = 'payment' then pt.amount else 0 end::numeric as paid_amount,
  case when pt.entry_type = 'debt' then pt.amount else 0 end::numeric as remaining_amount,
  pt.currency,
  case when pt.currency = 'USD' then pt.amount else 0 end::numeric as total_amount_usd,
  case when pt.currency = 'USD' and pt.entry_type = 'payment' then pt.amount else 0 end::numeric as paid_amount_usd,
  case when pt.currency = 'USD' and pt.entry_type = 'debt' then pt.amount else 0 end::numeric as remaining_amount_usd,
  case when pt.currency = 'IQD' then pt.amount else 0 end::numeric as total_amount_iqd,
  case when pt.currency = 'IQD' and pt.entry_type = 'payment' then pt.amount else 0 end::numeric as paid_amount_iqd,
  case when pt.currency = 'IQD' and pt.entry_type = 'debt' then pt.amount else 0 end::numeric as remaining_amount_iqd,
  pt.date as invoice_date,
  null::date as due_date,
  coalesce(pt.notes, pt.description) as notes,
  photo.storage_path as image_path,
  pt.created_by,
  coalesce(created_profile.full_name, created_profile.email::text) as created_by_name,
  pt.deleted_by,
  pt.deleted_at,
  pt.created_at
from public.party_transactions as pt
left join public.workers as w
  on w.id = pt.worker_id
left join public.suppliers as s
  on s.id = pt.supplier_id
left join public.project_buildings as pb
  on pb.id = pt.building_id
left join public.projects as p
  on p.id = pb.project_id
left join public.expense_categories as ec
  on ec.id = pt.category_id
left join public.profiles as created_profile
  on created_profile.id = pt.created_by
left join lateral (
  select tp.storage_path
  from public.transaction_photos as tp
  where tp.transaction_id = pt.id
  order by tp.created_at desc, tp.id desc
  limit 1
) as photo on true;

create or replace view public.app_invoice_history
with (security_invoker = true)
as
select
  pth.id,
  pth.transaction_id as invoice_id,
  case when pth.change_type = 'delete' then 'updated' else 'updated' end::text as change_type,
  coalesce(nullif(pth.old_description, ''), 'TX-' || pth.transaction_id::text) as number,
  case
    when pth.old_entity_type = 'worker' then 'labor'
    when pth.old_entity_type = 'supplier' then 'products'
    else 'logistics'
  end::text as expense_type,
  pth.old_worker_id as labor_worker_id,
  w.name as labor_worker_name,
  w.name as labor_person_name,
  case when pth.old_entry_type = 'payment' then 'paid' else 'unpaid' end::text as status,
  pth.old_supplier_id as supplier_id,
  s.name as supplier_name,
  pb.project_id,
  p.name as project_name,
  pth.old_building_id as building_id,
  pb.name as building_name,
  null::bigint as product_id,
  ec.name as product_name,
  pth.old_amount as total_amount,
  case when pth.old_entry_type = 'payment' then pth.old_amount else 0 end::numeric as paid_amount,
  case when pth.old_entry_type = 'debt' then pth.old_amount else 0 end::numeric as remaining_amount,
  pth.old_currency as currency,
  case when pth.old_currency = 'USD' then pth.old_amount else 0 end::numeric as total_amount_usd,
  case when pth.old_currency = 'USD' and pth.old_entry_type = 'payment' then pth.old_amount else 0 end::numeric as paid_amount_usd,
  case when pth.old_currency = 'USD' and pth.old_entry_type = 'debt' then pth.old_amount else 0 end::numeric as remaining_amount_usd,
  case when pth.old_currency = 'IQD' then pth.old_amount else 0 end::numeric as total_amount_iqd,
  case when pth.old_currency = 'IQD' and pth.old_entry_type = 'payment' then pth.old_amount else 0 end::numeric as paid_amount_iqd,
  case when pth.old_currency = 'IQD' and pth.old_entry_type = 'debt' then pth.old_amount else 0 end::numeric as remaining_amount_iqd,
  pth.old_date as invoice_date,
  null::date as due_date,
  coalesce(pth.old_notes, pth.old_description) as notes,
  null::text as image_path,
  pth.changed_by,
  coalesce(changed_profile.full_name, changed_profile.email::text) as changed_by_name,
  pth.changed_at
from public.party_transaction_history as pth
left join public.workers as w
  on w.id = pth.old_worker_id
left join public.suppliers as s
  on s.id = pth.old_supplier_id
left join public.project_buildings as pb
  on pb.id = pth.old_building_id
left join public.projects as p
  on p.id = pb.project_id
left join public.expense_categories as ec
  on ec.id = pth.old_category_id
left join public.profiles as changed_profile
  on changed_profile.id = pth.changed_by;

create or replace view public.all_expenses
with (security_invoker = true)
as
select
  i.id,
  'transaction'::text as expense_source,
  i.number as reference,
  coalesce(i.product_name, i.expense_type, 'general') as category,
  i.total_amount as amount,
  i.currency,
  i.total_amount_usd as amount_usd,
  i.total_amount_iqd as amount_iqd,
  i.notes,
  i.invoice_date as date,
  i.project_id,
  i.project_name,
  i.supplier_id,
  i.supplier_name,
  i.labor_worker_id,
  i.labor_worker_name,
  i.status,
  case
    when i.labor_worker_id is not null then 'worker'
    when i.supplier_id is not null then 'supplier'
    else 'supplier'
  end::text as party_type,
  i.total_amount,
  i.paid_amount,
  i.remaining_amount,
  i.due_date,
  i.image_path,
  i.created_by,
  i.created_by_name,
  i.record_status,
  i.created_at
from public.app_invoices as i;

create or replace function public.get_invoices()
returns table(
  id text,
  created_at timestamp without time zone,
  expense_source text,
  reference text,
  category text,
  amount text,
  amount_usd text,
  amount_iqd text,
  currency text,
  notes text,
  date date,
  project_id text,
  project_name text,
  supplier_id text,
  supplier_name text,
  labor_worker_id text,
  labor_worker_name text,
  status text,
  party_type text,
  total_amount text,
  paid_amount text,
  remaining_amount text,
  due_date date,
  image_path text,
  created_by text,
  created_by_name text,
  record_status text
)
language sql
stable
set search_path to 'public'
as $function$
  select
    id::text,
    created_at::timestamp,
    expense_source,
    reference,
    category,
    amount::text,
    amount_usd::text,
    amount_iqd::text,
    currency,
    notes,
    date,
    project_id::text,
    project_name,
    supplier_id::text,
    supplier_name,
    labor_worker_id::text,
    labor_worker_name,
    status,
    party_type,
    total_amount::text,
    paid_amount::text,
    remaining_amount::text,
    due_date,
    image_path,
    created_by::text,
    created_by_name,
    record_status
  from public.all_expenses
  where record_status = 'active';
$function$;

create or replace function public.get_party_transactions()
returns table(
  id text,
  created_at timestamp without time zone,
  expense_source text,
  reference text,
  category text,
  amount text,
  amount_usd text,
  amount_iqd text,
  currency text,
  notes text,
  date date,
  project_id text,
  project_name text,
  supplier_id text,
  supplier_name text,
  labor_worker_id text,
  labor_worker_name text,
  status text,
  party_type text,
  total_amount text,
  paid_amount text,
  remaining_amount text,
  due_date date,
  image_path text,
  created_by text,
  created_by_name text,
  record_status text
)
language sql
stable
set search_path to 'public'
as $function$
  select *
  from public.get_invoices();
$function$;

create or replace function public.get_dashboard_overview()
returns jsonb
language sql
stable
set search_path to 'public'
as $function$
with visible_projects as (
  select id, name, status
  from public.projects
),
visible_invoices as (
  select *
  from public.app_invoices
  where record_status = 'active'
),
visible_workers as (
  select id, name, role, balance, balance_usd, balance_iqd
  from public.app_workers
),
visible_transactions as (
  select worker_id, type, amount, amount_usd, amount_iqd
  from public.app_worker_transactions
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
  'totalWorkers', (select count(*) from visible_workers),
  'activeProjects', (select count(*) from visible_projects where status = 'active'),
  'totalSuppliers', (select count(*) from public.suppliers),
  'invoicesUnpaid', (select count(*) from visible_invoices where status <> 'paid'),
  'totalInvoiceAmount', coalesce((select sum(total_amount) from visible_invoices), 0),
  'totalPaidAmount', coalesce((select sum(paid_amount) from visible_invoices), 0),
  'remainingAmount', coalesce((select sum(remaining_amount) from visible_invoices), 0),
  'totalInvoiceAmountUsd', coalesce((select sum(total_amount_usd) from visible_invoices), 0),
  'totalPaidAmountUsd', coalesce((select sum(paid_amount_usd) from visible_invoices), 0),
  'remainingAmountUsd', coalesce((select sum(remaining_amount_usd) from visible_invoices), 0),
  'totalInvoiceAmountIqd', coalesce((select sum(total_amount_iqd) from visible_invoices), 0),
  'totalPaidAmountIqd', coalesce((select sum(paid_amount_iqd) from visible_invoices), 0),
  'remainingAmountIqd', coalesce((select sum(remaining_amount_iqd) from visible_invoices), 0),
  'projectsSummary', coalesce((
    select jsonb_agg(jsonb_build_object(
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
    ) order by ps.remaining_usd desc, ps.remaining_iqd desc, ps.name asc)
    from project_summaries as ps
  ), '[]'::jsonb),
  'workersSummary', coalesce((
    select jsonb_agg(jsonb_build_object(
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
    ) order by abs(ws.balance_usd) desc, abs(ws.balance_iqd) desc, ws.name asc)
    from worker_summaries as ws
  ), '[]'::jsonb),
  'invoicesSummary', coalesce((
    select jsonb_agg(jsonb_build_object(
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
    ) order by inv.remaining_usd desc, inv.remaining_iqd desc, inv.number asc)
    from invoice_summaries as inv
  ), '[]'::jsonb)
);
$function$;

grant select on
  public.app_projects,
  public.app_workers,
  public.app_suppliers,
  public.app_products,
  public.app_income_transactions,
  public.app_income_transaction_history,
  public.app_party_transactions,
  public.app_worker_transactions,
  public.app_supplier_transactions,
  public.app_invoices,
  public.app_invoice_history,
  public.all_expenses
to authenticated;
