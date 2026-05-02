-- Remove legacy party transaction functions that still reference dropped columns.

drop trigger if exists trg_party_transactions_history on public.party_transactions;
drop function if exists public.fn_party_transactions_history();
drop function if exists public.sync_expense_party_transactions();

create or replace function public.fn_protect_supplier_deletion()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  bal_usd numeric;
  bal_iqd numeric;
begin
  select
    coalesce(sum(coalesce(total_amount_usd, 0) - coalesce(paid_amount_usd, 0)), 0),
    coalesce(sum(coalesce(total_amount_iqd, 0) - coalesce(paid_amount_iqd, 0)), 0)
  into bal_usd, bal_iqd
  from public.party_transactions
  where supplier_id = old.id
    and deleted_at is null;

  if bal_usd <> 0 or bal_iqd <> 0 then
    raise exception 'Impossible de supprimer ce fournisseur : solde non soldé (USD: %, IQD: %)', bal_usd, bal_iqd;
  end if;

  return old;
end;
$function$;

create or replace function public.fn_protect_worker_deletion()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  bal_usd numeric;
  bal_iqd numeric;
begin
  select
    coalesce(sum(coalesce(total_amount_usd, 0) - coalesce(paid_amount_usd, 0)), 0),
    coalesce(sum(coalesce(total_amount_iqd, 0) - coalesce(paid_amount_iqd, 0)), 0)
  into bal_usd, bal_iqd
  from public.party_transactions
  where worker_id = old.id
    and deleted_at is null;

  if bal_usd <> 0 or bal_iqd <> 0 then
    raise exception 'Impossible de supprimer ce travailleur : solde non soldé (USD: %, IQD: %)', bal_usd, bal_iqd;
  end if;

  return old;
end;
$function$;

create or replace function public.recalculate_worker_balance(target_worker_id bigint)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  -- Balances are now computed by worker_balances/app_workers views.
  return;
end;
$function$;

create or replace function public.sync_party_balance()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  return coalesce(new, old);
end;
$function$;

create or replace function public.sync_worker_balance_from_party_transactions()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  return coalesce(new, old);
end;
$function$;

notify pgrst, 'reload schema';
