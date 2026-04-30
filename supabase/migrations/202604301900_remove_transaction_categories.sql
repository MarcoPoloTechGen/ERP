-- Remove transaction category storage and preserve both currency amounts.

alter table if exists public.party_transactions
  add column if not exists amount_usd numeric not null default 0,
  add column if not exists amount_iqd numeric not null default 0;

update public.party_transactions
set
  amount_usd = case
    when amount_usd <> 0 then amount_usd
    when currency = 'USD' then amount
    else 0
  end,
  amount_iqd = case
    when amount_iqd <> 0 then amount_iqd
    when currency = 'IQD' then amount
    else 0
  end
where amount_usd = 0
  and amount_iqd = 0;

alter table if exists public.income_transactions
  add column if not exists amount_usd numeric not null default 0,
  add column if not exists amount_iqd numeric not null default 0;

update public.income_transactions
set
  amount_usd = case
    when amount_usd <> 0 then amount_usd
    when currency = 'USD' then amount
    else 0
  end,
  amount_iqd = case
    when amount_iqd <> 0 then amount_iqd
    when currency = 'IQD' then amount
    else 0
  end
where amount_usd = 0
  and amount_iqd = 0;

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
    old_description,
    old_notes,
    old_date,
    changed_by
  )
  values (
    old.id,
    lower(tg_op),
    old.entry_type,
    old.entity_type,
    old.worker_id,
    old.supplier_id,
    old.building_id,
    old.amount,
    old.currency,
    old.description,
    old.notes,
    old.date,
    actor_id
  );

  return coalesce(new, old);
end;
$function$;

drop trigger if exists trg_log_party_transaction_history on public.party_transactions;
drop trigger if exists party_transaction_history_trigger on public.party_transactions;
drop trigger if exists log_party_transaction_history_trigger on public.party_transactions;

create trigger trg_log_party_transaction_history
after update or delete on public.party_transactions
for each row execute function public.log_party_transaction_history();

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
left join public.profiles as changed_profile
  on changed_profile.id = pth.changed_by;

create or replace view public.all_expenses
with (security_invoker = true)
as
select
  i.id,
  'transaction'::text as expense_source,
  i.number as reference,
  coalesce(i.expense_type, 'general') as category,
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

drop index if exists idx_party_transactions_expense_category;

alter table if exists public.party_transactions
  drop constraint if exists party_transactions_category_id_fkey,
  drop column if exists category_id,
  drop column if exists expense_category;

alter table if exists public.party_transaction_history
  drop column if exists old_category_id;

drop table if exists public.expense_categories;

grant select on
  public.app_income_transactions,
  public.app_party_transactions,
  public.app_worker_transactions,
  public.app_supplier_transactions,
  public.app_invoices,
  public.app_invoice_history,
  public.all_expenses
to authenticated;
