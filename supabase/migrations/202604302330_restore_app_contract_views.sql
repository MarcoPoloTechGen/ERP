-- Restore the app-facing Supabase contract after remote migration drift.
-- This migration is intentionally additive/idempotent: it recreates views and
-- reintroduces compatibility columns used by the React app without dropping data.

alter table if exists public.party_transactions
  add column if not exists amount numeric,
  add column if not exists currency text not null default 'USD';

update public.party_transactions
set
  amount = coalesce(
    amount,
    nullif(amount_usd, 0),
    nullif(amount_iqd, 0),
    0
  ),
  currency = case
    when coalesce(amount_usd, 0) > 0 then 'USD'
    when coalesce(amount_iqd, 0) > 0 then 'IQD'
    else coalesce(nullif(currency, ''), 'USD')
  end
where amount is null
  or currency is null
  or currency = '';

alter table if exists public.party_transactions
  alter column amount set default 0,
  alter column amount set not null,
  alter column currency set default 'USD',
  drop constraint if exists party_transactions_currency_check,
  add constraint party_transactions_currency_check check (currency in ('USD', 'IQD'));

alter table if exists public.income_transactions
  add column if not exists amount numeric,
  add column if not exists currency text not null default 'USD';

update public.income_transactions
set
  amount = coalesce(
    amount,
    nullif(amount_usd, 0),
    nullif(amount_iqd, 0),
    0
  ),
  currency = case
    when coalesce(amount_usd, 0) > 0 then 'USD'
    when coalesce(amount_iqd, 0) > 0 then 'IQD'
    else coalesce(nullif(currency, ''), 'USD')
  end
where amount is null
  or currency is null
  or currency = '';

alter table if exists public.income_transactions
  alter column amount set default 0,
  alter column amount set not null,
  alter column currency set default 'USD',
  drop constraint if exists income_transactions_currency_check,
  add constraint income_transactions_currency_check check (currency in ('USD', 'IQD'));

alter table if exists public.party_transaction_history
  add column if not exists old_amount numeric,
  add column if not exists old_currency text;

update public.party_transaction_history
set
  old_amount = coalesce(
    old_amount,
    nullif(old_amount_usd, 0),
    nullif(old_amount_iqd, 0),
    0
  ),
  old_currency = case
    when coalesce(old_amount_usd, 0) > 0 then 'USD'
    when coalesce(old_amount_iqd, 0) > 0 then 'IQD'
    else coalesce(nullif(old_currency, ''), 'USD')
  end
where old_amount is null
  or old_currency is null
  or old_currency = '';

alter table if exists public.party_transaction_history
  alter column old_currency set default 'USD',
  drop constraint if exists party_transaction_history_old_currency_check,
  add constraint party_transaction_history_old_currency_check check (old_currency is null or old_currency in ('USD', 'IQD'));

alter table if exists public.income_transaction_history
  add column if not exists old_amount numeric,
  add column if not exists old_currency text;

update public.income_transaction_history
set
  old_amount = coalesce(
    old_amount,
    nullif(old_amount_usd, 0),
    nullif(old_amount_iqd, 0),
    0
  ),
  old_currency = case
    when coalesce(old_amount_usd, 0) > 0 then 'USD'
    when coalesce(old_amount_iqd, 0) > 0 then 'IQD'
    else coalesce(nullif(old_currency, ''), 'USD')
  end
where old_amount is null
  or old_currency is null
  or old_currency = '';

alter table if exists public.income_transaction_history
  alter column old_currency set default 'USD',
  drop constraint if exists income_transaction_history_old_currency_check,
  add constraint income_transaction_history_old_currency_check check (old_currency is null or old_currency in ('USD', 'IQD'));

drop view if exists
  public.all_expenses,
  public.app_invoice_history,
  public.app_invoices,
  public.app_supplier_transactions,
  public.app_worker_transactions,
  public.app_party_transactions,
  public.app_income_transaction_history,
  public.app_income_transactions,
  public.app_suppliers,
  public.app_workers
cascade;

create or replace view public.app_workers
with (security_invoker = true)
as
select
  w.id,
  w.name,
  coalesce(w.role, '-') as role,
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

create or replace view public.app_income_transactions
with (security_invoker = true)
as
select
  it.id,
  it.project_id,
  p.name as project_name,
  it.amount,
  it.currency,
  coalesce(it.amount_usd, case when it.currency = 'USD' then it.amount else 0 end, 0)::numeric as amount_usd,
  coalesce(it.amount_iqd, case when it.currency = 'IQD' then it.amount else 0 end, 0)::numeric as amount_iqd,
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
  coalesce(ith.old_currency, 'USD') as currency,
  coalesce(ith.old_amount_usd, case when ith.old_currency = 'USD' then ith.old_amount else 0 end, 0)::numeric as amount_usd,
  coalesce(ith.old_amount_iqd, case when ith.old_currency = 'IQD' then ith.old_amount else 0 end, 0)::numeric as amount_iqd,
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
  coalesce(pt.amount_usd, case when pt.currency = 'USD' then pt.amount else 0 end, 0)::numeric as amount_usd,
  coalesce(pt.amount_iqd, case when pt.currency = 'IQD' then pt.amount else 0 end, 0)::numeric as amount_iqd,
  pt.description,
  pt.notes,
  pt.date,
  pb.project_id,
  p.name as project_name,
  pt.building_id,
  pb.name as building_name,
  null::bigint as category_id,
  null::text as expense_category,
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
  null::text as product_name,
  pt.amount as total_amount,
  case when pt.entry_type = 'payment' then pt.amount else 0 end::numeric as paid_amount,
  case when pt.entry_type = 'debt' then pt.amount else 0 end::numeric as remaining_amount,
  pt.currency,
  coalesce(pt.amount_usd, case when pt.currency = 'USD' then pt.amount else 0 end, 0)::numeric as total_amount_usd,
  case
    when pt.entry_type = 'payment'
      then coalesce(pt.amount_usd, case when pt.currency = 'USD' then pt.amount else 0 end, 0)
    else 0
  end::numeric as paid_amount_usd,
  case
    when pt.entry_type = 'debt'
      then coalesce(pt.amount_usd, case when pt.currency = 'USD' then pt.amount else 0 end, 0)
    else 0
  end::numeric as remaining_amount_usd,
  coalesce(pt.amount_iqd, case when pt.currency = 'IQD' then pt.amount else 0 end, 0)::numeric as total_amount_iqd,
  case
    when pt.entry_type = 'payment'
      then coalesce(pt.amount_iqd, case when pt.currency = 'IQD' then pt.amount else 0 end, 0)
    else 0
  end::numeric as paid_amount_iqd,
  case
    when pt.entry_type = 'debt'
      then coalesce(pt.amount_iqd, case when pt.currency = 'IQD' then pt.amount else 0 end, 0)
    else 0
  end::numeric as remaining_amount_iqd,
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
  null::text as product_name,
  pth.old_amount as total_amount,
  case when pth.old_entry_type = 'payment' then pth.old_amount else 0 end::numeric as paid_amount,
  case when pth.old_entry_type = 'debt' then pth.old_amount else 0 end::numeric as remaining_amount,
  coalesce(pth.old_currency, 'USD') as currency,
  coalesce(pth.old_amount_usd, case when pth.old_currency = 'USD' then pth.old_amount else 0 end, 0)::numeric as total_amount_usd,
  case
    when pth.old_entry_type = 'payment'
      then coalesce(pth.old_amount_usd, case when pth.old_currency = 'USD' then pth.old_amount else 0 end, 0)
    else 0
  end::numeric as paid_amount_usd,
  case
    when pth.old_entry_type = 'debt'
      then coalesce(pth.old_amount_usd, case when pth.old_currency = 'USD' then pth.old_amount else 0 end, 0)
    else 0
  end::numeric as remaining_amount_usd,
  coalesce(pth.old_amount_iqd, case when pth.old_currency = 'IQD' then pth.old_amount else 0 end, 0)::numeric as total_amount_iqd,
  case
    when pth.old_entry_type = 'payment'
      then coalesce(pth.old_amount_iqd, case when pth.old_currency = 'IQD' then pth.old_amount else 0 end, 0)
    else 0
  end::numeric as paid_amount_iqd,
  case
    when pth.old_entry_type = 'debt'
      then coalesce(pth.old_amount_iqd, case when pth.old_currency = 'IQD' then pth.old_amount else 0 end, 0)
    else 0
  end::numeric as remaining_amount_iqd,
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
  public.app_workers,
  public.app_suppliers,
  public.app_income_transactions,
  public.app_income_transaction_history,
  public.app_party_transactions,
  public.app_worker_transactions,
  public.app_supplier_transactions,
  public.app_invoices,
  public.app_invoice_history,
  public.all_expenses
to authenticated;

grant execute on function public.get_dashboard_overview() to authenticated;
grant execute on function public.get_invoices() to authenticated;
grant execute on function public.get_party_transactions() to authenticated;

notify pgrst, 'reload schema';
