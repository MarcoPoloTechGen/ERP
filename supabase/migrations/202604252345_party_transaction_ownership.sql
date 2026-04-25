alter table public.party_transactions
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

alter table public.party_transactions
  alter column created_by set default auth.uid();

update public.party_transactions as pt
set created_by = i.created_by
from public.invoices as i
where pt.source_invoice_id = i.id
  and pt.created_by is null;

drop policy if exists "party transactions scoped insert" on public.party_transactions;
drop policy if exists "party transactions manual insert" on public.party_transactions;
create policy "party transactions manual insert"
on public.party_transactions
for insert
to authenticated
with check (
  public.can_access_project(project_id)
  and source_invoice_id is null
  and source_kind is null
  and created_by = auth.uid()
);

drop policy if exists "party transactions scoped update" on public.party_transactions;
drop policy if exists "party transactions creator or admin update" on public.party_transactions;
create policy "party transactions creator or admin update"
on public.party_transactions
for update
to authenticated
using (
  public.can_access_project(project_id)
  and source_invoice_id is null
  and source_kind is null
  and (created_by = auth.uid() or public.is_admin())
)
with check (
  public.can_access_project(project_id)
  and source_invoice_id is null
  and source_kind is null
  and (created_by = auth.uid() or public.is_admin())
);

drop policy if exists "party transactions scoped delete" on public.party_transactions;
drop policy if exists "party transactions creator or admin delete" on public.party_transactions;
create policy "party transactions creator or admin delete"
on public.party_transactions
for delete
to authenticated
using (
  public.can_access_project(project_id)
  and source_invoice_id is null
  and source_kind is null
  and (created_by = auth.uid() or public.is_admin())
);

create or replace view public.app_party_transactions
with (security_invoker = true)
as
select
  pt.id,
  pt.party_type,
  coalesce(pt.worker_id, pt.supplier_id) as party_id,
  coalesce(w.name, s.name) as party_name,
  pt.worker_id,
  w.name as worker_name,
  pt.supplier_id,
  s.name as supplier_name,
  pt.project_id,
  p.name as project_name,
  pt.type,
  pt.amount,
  pt.currency,
  pt.description,
  pt.date,
  pt.created_at,
  pt.amount_usd,
  pt.amount_iqd,
  pt.source_invoice_id,
  pt.source_kind,
  pt.created_by,
  coalesce(created_profile.full_name, created_profile.email) as created_by_name,
  (
    pt.source_invoice_id is null
    and pt.source_kind is null
    and (pt.created_by = auth.uid() or public.is_admin())
  ) as can_manage
from public.party_transactions as pt
left join public.workers as w
  on w.id = pt.worker_id
left join public.suppliers as s
  on s.id = pt.supplier_id
left join public.projects as p
  on p.id = pt.project_id
left join public.profiles as created_profile
  on created_profile.id = pt.created_by;

create or replace view public.app_worker_transactions
with (security_invoker = true)
as
select
  pt.id,
  pt.worker_id,
  pt.project_id,
  p.name as project_name,
  pt.type,
  pt.amount,
  pt.currency,
  pt.description,
  pt.date,
  pt.created_at,
  pt.amount_usd,
  pt.amount_iqd,
  pt.source_invoice_id,
  pt.source_kind,
  pt.created_by,
  coalesce(created_profile.full_name, created_profile.email) as created_by_name,
  (
    pt.source_invoice_id is null
    and pt.source_kind is null
    and (pt.created_by = auth.uid() or public.is_admin())
  ) as can_manage
from public.party_transactions as pt
left join public.projects as p
  on p.id = pt.project_id
left join public.profiles as created_profile
  on created_profile.id = pt.created_by
where pt.party_type = 'worker';

create or replace view public.app_supplier_transactions
with (security_invoker = true)
as
select
  pt.id,
  pt.supplier_id,
  pt.project_id,
  p.name as project_name,
  pt.type,
  pt.amount,
  pt.currency,
  pt.description,
  pt.date,
  pt.created_at,
  pt.amount_usd,
  pt.amount_iqd,
  pt.source_invoice_id,
  pt.source_kind,
  pt.created_by,
  coalesce(created_profile.full_name, created_profile.email) as created_by_name,
  (
    pt.source_invoice_id is null
    and pt.source_kind is null
    and (pt.created_by = auth.uid() or public.is_admin())
  ) as can_manage
from public.party_transactions as pt
left join public.projects as p
  on p.id = pt.project_id
left join public.profiles as created_profile
  on created_profile.id = pt.created_by
where pt.party_type = 'supplier';

create or replace function public.sync_expense_party_transactions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  credit_amount numeric;
  credit_currency text;
  debit_amount numeric;
  debit_currency text;
  source_date date;
  source_kind text;
  source_title text;
  target_supplier_id bigint;
  target_worker_id bigint;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    delete from public.party_transactions
    where source_invoice_id = old.id
      and source_kind in ('labor_expense', 'supplier_expense');
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  if new.record_status <> 'active' then
    return new;
  end if;

  if new.expense_type = 'labor' and new.labor_worker_id is not null then
    target_worker_id := new.labor_worker_id;
    source_kind := 'labor_expense';
  elsif new.expense_type = 'products' and new.supplier_id is not null then
    target_supplier_id := new.supplier_id;
    source_kind := 'supplier_expense';
  else
    return new;
  end if;

  source_title := coalesce(nullif(new.number, ''), 'Expense');
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
    insert into public.party_transactions (
      party_type,
      worker_id,
      supplier_id,
      project_id,
      type,
      amount,
      currency,
      amount_usd,
      amount_iqd,
      description,
      date,
      source_invoice_id,
      source_kind,
      created_by
    )
    values (
      case when target_worker_id is not null then 'worker' else 'supplier' end,
      target_worker_id,
      target_supplier_id,
      new.project_id,
      'credit',
      credit_amount,
      credit_currency,
      coalesce(new.total_amount_usd, 0),
      coalesce(new.total_amount_iqd, 0),
      case
        when source_kind = 'labor_expense' then 'Labor earned: ' || source_title
        else 'Supplier invoice: ' || source_title
      end,
      source_date,
      new.id,
      source_kind,
      coalesce(new.created_by, auth.uid())
    );
  end if;

  if coalesce(new.paid_amount_usd, 0) > 0 or coalesce(new.paid_amount_iqd, 0) > 0 then
    insert into public.party_transactions (
      party_type,
      worker_id,
      supplier_id,
      project_id,
      type,
      amount,
      currency,
      amount_usd,
      amount_iqd,
      description,
      date,
      source_invoice_id,
      source_kind,
      created_by
    )
    values (
      case when target_worker_id is not null then 'worker' else 'supplier' end,
      target_worker_id,
      target_supplier_id,
      new.project_id,
      'debit',
      debit_amount,
      debit_currency,
      coalesce(new.paid_amount_usd, 0),
      coalesce(new.paid_amount_iqd, 0),
      case
        when source_kind = 'labor_expense' then 'Labor paid: ' || source_title
        else 'Supplier paid: ' || source_title
      end,
      source_date,
      new.id,
      source_kind,
      coalesce(new.created_by, auth.uid())
    );
  end if;

  return new;
end;
$$;

grant select on public.app_party_transactions to authenticated;
grant select on public.app_worker_transactions to authenticated;
grant select on public.app_supplier_transactions to authenticated;
