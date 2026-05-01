-- Move party transactions to the total/paid amount model.
-- The legacy entry_type/amount columns are kept as compatibility fields while
-- the application and reporting contract move to total_amount - paid_amount.

alter table if exists public.party_transactions
  add column if not exists total_amount_usd numeric not null default 0,
  add column if not exists paid_amount_usd numeric not null default 0,
  add column if not exists total_amount_iqd numeric not null default 0,
  add column if not exists paid_amount_iqd numeric not null default 0;

update public.party_transactions
set
  total_amount_usd = case
    when total_amount_usd <> 0 or paid_amount_usd <> 0 then total_amount_usd
    when entry_type = 'debt' then coalesce(amount_usd, case when currency = 'USD' then amount else 0 end, 0)
    else 0
  end,
  paid_amount_usd = case
    when total_amount_usd <> 0 or paid_amount_usd <> 0 then paid_amount_usd
    when entry_type = 'payment' then coalesce(amount_usd, case when currency = 'USD' then amount else 0 end, 0)
    else 0
  end,
  total_amount_iqd = case
    when total_amount_iqd <> 0 or paid_amount_iqd <> 0 then total_amount_iqd
    when entry_type = 'debt' then coalesce(amount_iqd, case when currency = 'IQD' then amount else 0 end, 0)
    else 0
  end,
  paid_amount_iqd = case
    when total_amount_iqd <> 0 or paid_amount_iqd <> 0 then paid_amount_iqd
    when entry_type = 'payment' then coalesce(amount_iqd, case when currency = 'IQD' then amount else 0 end, 0)
    else 0
  end;

alter table if exists public.party_transactions
  drop constraint if exists party_transactions_total_paid_amounts_check,
  add constraint party_transactions_total_paid_amounts_check
  check (
    total_amount_usd >= 0
    and paid_amount_usd >= 0
    and total_amount_iqd >= 0
    and paid_amount_iqd >= 0
    and (
      total_amount_usd > 0
      or paid_amount_usd > 0
      or total_amount_iqd > 0
      or paid_amount_iqd > 0
    )
  ) not valid;

alter table if exists public.party_transactions
  drop constraint if exists party_transactions_entity_check,
  add constraint party_transactions_entity_check
  check (
    (entity_type = 'worker' and worker_id is not null and supplier_id is null)
    or (entity_type = 'supplier' and supplier_id is not null and worker_id is null)
    or (entity_type = 'other' and worker_id is null and supplier_id is null)
  ) not valid;

alter table if exists public.party_transaction_history
  add column if not exists old_amount_usd numeric,
  add column if not exists old_amount_iqd numeric,
  add column if not exists old_total_amount_usd numeric,
  add column if not exists old_paid_amount_usd numeric,
  add column if not exists old_total_amount_iqd numeric,
  add column if not exists old_paid_amount_iqd numeric;

update public.party_transaction_history
set
  old_total_amount_usd = coalesce(
    old_total_amount_usd,
    case when old_entry_type = 'debt' then old_amount_usd else 0 end,
    0
  ),
  old_paid_amount_usd = coalesce(
    old_paid_amount_usd,
    case when old_entry_type = 'payment' then old_amount_usd else 0 end,
    0
  ),
  old_total_amount_iqd = coalesce(
    old_total_amount_iqd,
    case when old_entry_type = 'debt' then old_amount_iqd else 0 end,
    0
  ),
  old_paid_amount_iqd = coalesce(
    old_paid_amount_iqd,
    case when old_entry_type = 'payment' then old_amount_iqd else 0 end,
    0
  )
where old_total_amount_usd is null
  or old_paid_amount_usd is null
  or old_total_amount_iqd is null
  or old_paid_amount_iqd is null;

create or replace function public.log_party_transaction_history()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
declare
  actor_id uuid;
begin
  if tg_op = 'UPDATE' and new is not distinct from old then
    return new;
  end if;

  actor_id := auth.uid();
  if actor_id is null then
    if tg_op = 'DELETE' then
      actor_id := coalesce(old.updated_by, old.deleted_by);
    else
      actor_id := coalesce(new.updated_by, old.updated_by, new.deleted_by, old.deleted_by);
    end if;
  end if;

  insert into public.party_transaction_history (
    transaction_id,
    change_type,
    old_entry_type,
    old_entity_type,
    old_worker_id,
    old_supplier_id,
    old_building_id,
    old_amount,
    old_currency,
    old_amount_usd,
    old_amount_iqd,
    old_total_amount_usd,
    old_paid_amount_usd,
    old_total_amount_iqd,
    old_paid_amount_iqd,
    old_description,
    old_notes,
    old_date,
    changed_by
  )
  values (
    old.id,
    case when tg_op = 'DELETE' then 'delete' else 'update' end,
    old.entry_type,
    old.entity_type,
    old.worker_id,
    old.supplier_id,
    old.building_id,
    old.amount,
    old.currency,
    old.amount_usd,
    old.amount_iqd,
    old.total_amount_usd,
    old.paid_amount_usd,
    old.total_amount_iqd,
    old.paid_amount_iqd,
    old.description,
    old.notes,
    old.date,
    actor_id
  );

  return coalesce(new, old);
end;
$function$;

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
  case
    when (coalesce(pt.total_amount_usd, 0) - coalesce(pt.paid_amount_usd, 0)) < 0
      or (
        coalesce(pt.total_amount_usd, 0) = coalesce(pt.paid_amount_usd, 0)
        and (coalesce(pt.total_amount_iqd, 0) - coalesce(pt.paid_amount_iqd, 0)) < 0
      )
      then 'debit'
    else 'credit'
  end::text as type,
  case
    when coalesce(pt.total_amount_usd, 0) > 0 or coalesce(pt.paid_amount_usd, 0) > 0
      then abs(coalesce(pt.total_amount_usd, 0) - coalesce(pt.paid_amount_usd, 0))
    else abs(coalesce(pt.total_amount_iqd, 0) - coalesce(pt.paid_amount_iqd, 0))
  end::numeric as amount,
  case
    when coalesce(pt.total_amount_usd, 0) > 0 or coalesce(pt.paid_amount_usd, 0) > 0 then 'USD'
    else 'IQD'
  end::text as currency,
  abs(coalesce(pt.total_amount_usd, 0) - coalesce(pt.paid_amount_usd, 0))::numeric as amount_usd,
  abs(coalesce(pt.total_amount_iqd, 0) - coalesce(pt.paid_amount_iqd, 0))::numeric as amount_iqd,
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
  pt.deleted_at is null as can_manage,
  coalesce(pt.total_amount_usd, 0)::numeric as total_amount_usd,
  coalesce(pt.paid_amount_usd, 0)::numeric as paid_amount_usd,
  coalesce(pt.total_amount_iqd, 0)::numeric as total_amount_iqd,
  coalesce(pt.paid_amount_iqd, 0)::numeric as paid_amount_iqd
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
  case
    when coalesce(pt.total_amount_usd, 0) <= coalesce(pt.paid_amount_usd, 0)
      and coalesce(pt.total_amount_iqd, 0) <= coalesce(pt.paid_amount_iqd, 0)
      then 'paid'
    when coalesce(pt.paid_amount_usd, 0) > 0 or coalesce(pt.paid_amount_iqd, 0) > 0
      then 'partial'
    else 'unpaid'
  end::text as status,
  case when pt.deleted_at is null then 'active' else 'deleted' end::text as record_status,
  pt.supplier_id,
  s.name as supplier_name,
  pb.project_id,
  p.name as project_name,
  pt.building_id,
  pb.name as building_name,
  null::bigint as product_id,
  null::text as product_name,
  case
    when coalesce(pt.total_amount_usd, 0) > 0 then pt.total_amount_usd
    else coalesce(pt.total_amount_iqd, 0)
  end::numeric as total_amount,
  case
    when coalesce(pt.total_amount_usd, 0) > 0 or coalesce(pt.paid_amount_usd, 0) > 0 then pt.paid_amount_usd
    else coalesce(pt.paid_amount_iqd, 0)
  end::numeric as paid_amount,
  case
    when coalesce(pt.total_amount_usd, 0) > 0 or coalesce(pt.paid_amount_usd, 0) > 0
      then greatest(coalesce(pt.total_amount_usd, 0) - coalesce(pt.paid_amount_usd, 0), 0)
    else greatest(coalesce(pt.total_amount_iqd, 0) - coalesce(pt.paid_amount_iqd, 0), 0)
  end::numeric as remaining_amount,
  case
    when coalesce(pt.total_amount_usd, 0) > 0 or coalesce(pt.paid_amount_usd, 0) > 0 then 'USD'
    else 'IQD'
  end::text as currency,
  coalesce(pt.total_amount_usd, 0)::numeric as total_amount_usd,
  coalesce(pt.paid_amount_usd, 0)::numeric as paid_amount_usd,
  greatest(coalesce(pt.total_amount_usd, 0) - coalesce(pt.paid_amount_usd, 0), 0)::numeric as remaining_amount_usd,
  coalesce(pt.total_amount_iqd, 0)::numeric as total_amount_iqd,
  coalesce(pt.paid_amount_iqd, 0)::numeric as paid_amount_iqd,
  greatest(coalesce(pt.total_amount_iqd, 0) - coalesce(pt.paid_amount_iqd, 0), 0)::numeric as remaining_amount_iqd,
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
  case
    when coalesce(pth.old_total_amount_usd, 0) <= coalesce(pth.old_paid_amount_usd, 0)
      and coalesce(pth.old_total_amount_iqd, 0) <= coalesce(pth.old_paid_amount_iqd, 0)
      then 'paid'
    when coalesce(pth.old_paid_amount_usd, 0) > 0 or coalesce(pth.old_paid_amount_iqd, 0) > 0
      then 'partial'
    else 'unpaid'
  end::text as status,
  pth.old_supplier_id as supplier_id,
  s.name as supplier_name,
  pb.project_id,
  p.name as project_name,
  pth.old_building_id as building_id,
  pb.name as building_name,
  null::bigint as product_id,
  null::text as product_name,
  case
    when coalesce(pth.old_total_amount_usd, 0) > 0 then pth.old_total_amount_usd
    else coalesce(pth.old_total_amount_iqd, 0)
  end::numeric as total_amount,
  case
    when coalesce(pth.old_total_amount_usd, 0) > 0 or coalesce(pth.old_paid_amount_usd, 0) > 0 then pth.old_paid_amount_usd
    else coalesce(pth.old_paid_amount_iqd, 0)
  end::numeric as paid_amount,
  case
    when coalesce(pth.old_total_amount_usd, 0) > 0 or coalesce(pth.old_paid_amount_usd, 0) > 0
      then greatest(coalesce(pth.old_total_amount_usd, 0) - coalesce(pth.old_paid_amount_usd, 0), 0)
    else greatest(coalesce(pth.old_total_amount_iqd, 0) - coalesce(pth.old_paid_amount_iqd, 0), 0)
  end::numeric as remaining_amount,
  coalesce(pth.old_currency, 'USD') as currency,
  coalesce(pth.old_total_amount_usd, 0)::numeric as total_amount_usd,
  coalesce(pth.old_paid_amount_usd, 0)::numeric as paid_amount_usd,
  greatest(coalesce(pth.old_total_amount_usd, 0) - coalesce(pth.old_paid_amount_usd, 0), 0)::numeric as remaining_amount_usd,
  coalesce(pth.old_total_amount_iqd, 0)::numeric as total_amount_iqd,
  coalesce(pth.old_paid_amount_iqd, 0)::numeric as paid_amount_iqd,
  greatest(coalesce(pth.old_total_amount_iqd, 0) - coalesce(pth.old_paid_amount_iqd, 0), 0)::numeric as remaining_amount_iqd,
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
    else 'other'
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
  select
    worker_id,
    total_amount_usd,
    paid_amount_usd,
    total_amount_iqd,
    paid_amount_iqd
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
    coalesce(sum(coalesce(wt.total_amount_usd, 0) - coalesce(wt.paid_amount_usd, 0)), 0)::numeric(12,2) as balance,
    coalesce(sum(coalesce(wt.total_amount_usd, 0) - coalesce(wt.paid_amount_usd, 0)), 0)::numeric(12,2) as balance_usd,
    coalesce(sum(coalesce(wt.total_amount_iqd, 0) - coalesce(wt.paid_amount_iqd, 0)), 0)::numeric(12,2) as balance_iqd,
    coalesce(sum(wt.total_amount_usd), 0)::numeric(12,2) as total_credit,
    coalesce(sum(wt.paid_amount_usd), 0)::numeric(12,2) as total_debit,
    coalesce(sum(wt.total_amount_usd), 0)::numeric(12,2) as total_credit_usd,
    coalesce(sum(wt.paid_amount_usd), 0)::numeric(12,2) as total_debit_usd,
    coalesce(sum(wt.total_amount_iqd), 0)::numeric(12,2) as total_credit_iqd,
    coalesce(sum(wt.paid_amount_iqd), 0)::numeric(12,2) as total_debit_iqd
  from visible_workers as w
  left join visible_transactions as wt
    on wt.worker_id = w.id
  group by w.id, w.name, w.role
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

grant select on public.app_party_transactions to authenticated;
grant select on public.app_worker_transactions to authenticated;
grant select on public.app_supplier_transactions to authenticated;
grant select on public.app_invoices to authenticated;
grant select on public.app_invoice_history to authenticated;
grant select on public.all_expenses to authenticated;
grant execute on function public.get_dashboard_overview() to authenticated;

notify pgrst, 'reload schema';
