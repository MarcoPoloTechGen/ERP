-- Fix ambiguous column reference in sync_expense_party_transactions trigger
-- The source_kind variable in the trigger was conflicting with the table column

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
    delete from public.party_transactions as pt
    where pt.source_invoice_id = old.id
      and pt.source_kind in ('labor_expense', 'supplier_expense');
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
