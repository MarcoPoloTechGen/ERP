alter table public.invoices
  add column if not exists internal_id uuid,
  add column if not exists record_status text,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.profiles(id) on delete set null;

update public.invoices
set
  internal_id = coalesce(internal_id, gen_random_uuid()),
  record_status = coalesce(record_status, 'active')
where internal_id is null
   or record_status is null;

alter table public.invoices
  alter column internal_id set default gen_random_uuid();

alter table public.invoices
  alter column internal_id set not null;

alter table public.invoices
  alter column record_status set default 'active';

alter table public.invoices
  alter column record_status set not null;

create unique index if not exists idx_invoices_internal_id on public.invoices(internal_id);
create index if not exists idx_invoices_record_status on public.invoices(record_status);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'invoices_record_status_check'
      and conrelid = 'public.invoices'::regclass
  ) then
    alter table public.invoices
      add constraint invoices_record_status_check
      check (record_status in ('active', 'deleted'));
  end if;
end
$$;

alter table public.income_transactions
  add column if not exists internal_id uuid,
  add column if not exists record_status text,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.profiles(id) on delete set null;

update public.income_transactions
set
  internal_id = coalesce(internal_id, gen_random_uuid()),
  record_status = coalesce(record_status, 'active')
where internal_id is null
   or record_status is null;

alter table public.income_transactions
  alter column internal_id set default gen_random_uuid();

alter table public.income_transactions
  alter column internal_id set not null;

alter table public.income_transactions
  alter column record_status set default 'active';

alter table public.income_transactions
  alter column record_status set not null;

create unique index if not exists idx_income_transactions_internal_id on public.income_transactions(internal_id);
create index if not exists idx_income_transactions_record_status on public.income_transactions(record_status);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'income_transactions_record_status_check'
      and conrelid = 'public.income_transactions'::regclass
  ) then
    alter table public.income_transactions
      add constraint income_transactions_record_status_check
      check (record_status in ('active', 'deleted'));
  end if;
end
$$;

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
  it.deleted_by
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
  i.deleted_by
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
    remaining_amount
  from public.app_invoices
  where record_status = 'active'
),
visible_workers as (
  select id, name, role, balance
  from public.workers
),
visible_transactions as (
  select worker_id, type, amount
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
    coalesce(sum(i.remaining_amount), 0)::numeric(12,2) as remaining
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
    coalesce(sum(case when wt.type = 'credit' then wt.amount else 0 end), 0)::numeric(12,2) as total_credit,
    coalesce(sum(case when wt.type = 'debit' then wt.amount else 0 end), 0)::numeric(12,2) as total_debit
  from visible_workers as w
  left join visible_transactions as wt
    on wt.worker_id = w.id
  group by w.id, w.name, w.role, w.balance
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
    remaining_amount as remaining
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
  'projectsSummary',
  coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', id,
          'name', name,
          'status', status,
          'invoiceCount', invoice_count,
          'totalInvoiced', total_invoiced,
          'totalPaid', total_paid,
          'remaining', remaining
        )
        order by remaining desc, name asc
      )
      from project_summaries
    ),
    '[]'::jsonb
  ),
  'workersSummary',
  coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', id,
          'name', name,
          'role', role,
          'balance', balance,
          'totalCredit', total_credit,
          'totalDebit', total_debit
        )
        order by abs(balance) desc, name asc
      )
      from worker_summaries
    ),
    '[]'::jsonb
  ),
  'invoicesSummary',
  coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', id,
          'number', number,
          'status', status,
          'supplierName', supplier_name,
          'projectName', project_name,
          'totalAmount', total_amount,
          'paidAmount', paid_amount,
          'remaining', remaining
        )
        order by remaining desc, number asc
      )
      from invoice_summaries
    ),
    '[]'::jsonb
  )
);
$$;
