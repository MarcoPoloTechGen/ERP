-- Income entries must be assigned to a concrete project building.
-- Existing rows are backfilled to the project's default building when possible.

alter table if exists public.income_transactions
  add column if not exists building_id bigint references public.project_buildings(id) on delete set null;

with ranked_buildings as (
  select
    pb.id,
    pb.project_id,
    row_number() over (
      partition by pb.project_id
      order by pb.is_default desc, pb.id asc
    ) as rank
  from public.project_buildings as pb
)
update public.income_transactions as it
set building_id = rb.id
from ranked_buildings as rb
where rb.project_id = it.project_id
  and rb.rank = 1
  and it.building_id is null;

create index if not exists idx_income_transactions_building_id
  on public.income_transactions(building_id);

alter table if exists public.income_transactions
  drop constraint if exists income_transactions_building_required;

alter table if exists public.income_transactions
  add constraint income_transactions_building_required
  check (building_id is not null)
  not valid;

comment on constraint income_transactions_building_required on public.income_transactions
  is 'Requires every income transaction to be linked to a project building.';

create or replace function public.validate_income_transaction_building()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  target_project_id bigint;
begin
  if new.building_id is null then
    raise exception 'Income transaction building_id is required.';
  end if;

  select pb.project_id
  into target_project_id
  from public.project_buildings as pb
  where pb.id = new.building_id;

  if target_project_id is null then
    raise exception 'Income transaction building_id is invalid.';
  end if;

  if new.project_id is distinct from target_project_id then
    raise exception 'Income transaction building must belong to the selected project.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_income_transaction_building on public.income_transactions;
create trigger trg_validate_income_transaction_building
before insert or update of project_id, building_id on public.income_transactions
for each row execute function public.validate_income_transaction_building();

alter table if exists public.income_transaction_history
  add column if not exists project_id bigint references public.projects(id) on delete set null,
  add column if not exists project_name text,
  add column if not exists amount numeric,
  add column if not exists currency text,
  add column if not exists amount_usd numeric,
  add column if not exists amount_iqd numeric,
  add column if not exists description text,
  add column if not exists date date,
  add column if not exists record_status text,
  add column if not exists changed_by_name text,
  add column if not exists old_project_id bigint references public.projects(id) on delete set null,
  add column if not exists old_amount numeric,
  add column if not exists old_currency text,
  add column if not exists old_amount_usd numeric,
  add column if not exists old_amount_iqd numeric,
  add column if not exists old_description text,
  add column if not exists old_date date,
  add column if not exists old_building_id bigint references public.project_buildings(id) on delete set null,
  add column if not exists old_building_name text,
  add column if not exists building_id bigint references public.project_buildings(id) on delete set null,
  add column if not exists building_name text;

update public.income_transaction_history as ith
set
  project_id = coalesce(ith.project_id, it.project_id),
  project_name = coalesce(ith.project_name, p.name),
  amount = coalesce(ith.amount, it.amount),
  currency = coalesce(ith.currency, it.currency),
  amount_usd = coalesce(ith.amount_usd, it.amount_usd),
  amount_iqd = coalesce(ith.amount_iqd, it.amount_iqd),
  description = coalesce(ith.description, it.description),
  date = coalesce(ith.date, it.date),
  record_status = coalesce(ith.record_status, case when it.deleted_at is null then 'active' else 'deleted' end),
  old_project_id = coalesce(ith.old_project_id, it.project_id),
  old_amount = coalesce(ith.old_amount, it.amount),
  old_currency = coalesce(ith.old_currency, it.currency),
  old_amount_usd = coalesce(ith.old_amount_usd, it.amount_usd),
  old_amount_iqd = coalesce(ith.old_amount_iqd, it.amount_iqd),
  old_description = coalesce(ith.old_description, it.description),
  old_date = coalesce(ith.old_date, it.date),
  old_building_id = coalesce(ith.old_building_id, it.building_id),
  building_id = coalesce(ith.building_id, it.building_id),
  old_building_name = coalesce(ith.old_building_name, pb.name),
  building_name = coalesce(ith.building_name, pb.name)
from public.income_transactions as it
left join public.projects as p
  on p.id = it.project_id
left join public.project_buildings as pb
  on pb.id = it.building_id
where ith.income_transaction_id = it.id
  and (
    ith.project_id is null
    or ith.amount is null
    or ith.currency is null
    or ith.amount_usd is null
    or ith.amount_iqd is null
    or ith.date is null
    or ith.record_status is null
    or ith.old_project_id is null
    or ith.old_amount is null
    or ith.old_currency is null
    or ith.old_amount_usd is null
    or ith.old_amount_iqd is null
    or ith.old_date is null
    or ith.old_building_id is null
    or ith.building_id is null
    or ith.old_building_name is null
    or ith.building_name is null
  );

create or replace function public.log_income_transaction_history()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  actor_id uuid;
  actor_name text;
  snapshot_project_name text;
  snapshot_building_name text;
  snapshot_change_type text;
begin
  if tg_op = 'UPDATE' and new is not distinct from old then
    return new;
  end if;

  if tg_op = 'INSERT' then
    actor_id := coalesce(auth.uid(), new.created_by);
    snapshot_change_type := 'created';
  else
    actor_id := coalesce(auth.uid(), new.deleted_by, new.updated_by, new.created_by, old.created_by);
    snapshot_change_type := case
      when new.deleted_at is not null and old.deleted_at is distinct from new.deleted_at then 'deleted'
      else 'updated'
    end;
  end if;

  if actor_id is not null then
    select coalesce(p.full_name, p.email)
    into actor_name
    from public.profiles as p
    where p.id = actor_id;
  end if;

  select p.name
  into snapshot_project_name
  from public.projects as p
  where p.id = new.project_id;

  select pb.name
  into snapshot_building_name
  from public.project_buildings as pb
  where pb.id = new.building_id;

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
    old_project_id,
    old_amount,
    old_currency,
    old_amount_usd,
    old_amount_iqd,
    old_description,
    old_date,
    old_building_id,
    old_building_name,
    building_id,
    building_name,
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
    case when new.deleted_at is null then 'active' else 'deleted' end,
    new.project_id,
    new.amount,
    new.currency,
    new.amount_usd,
    new.amount_iqd,
    new.description,
    new.date,
    new.building_id,
    snapshot_building_name,
    new.building_id,
    snapshot_building_name,
    actor_id,
    actor_name,
    case when tg_op = 'INSERT' then coalesce(new.created_at, now()) else now() end
  );

  return new;
end;
$$;

drop trigger if exists trg_log_income_transaction_history on public.income_transactions;
create trigger trg_log_income_transaction_history
after insert or update on public.income_transactions
for each row execute function public.log_income_transaction_history();

drop view if exists public.app_income_transaction_history;
drop view if exists public.app_income_transactions;

create or replace view public.app_income_transactions
with (security_invoker = true)
as
select
  it.id,
  it.project_id,
  p.name as project_name,
  it.building_id,
  pb.name as building_name,
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
left join public.project_buildings as pb
  on pb.id = it.building_id
left join public.profiles as created_profile
  on created_profile.id = it.created_by;

create or replace view public.app_income_transaction_history
with (security_invoker = true)
as
select
  ith.id,
  ith.income_transaction_id,
  case
    when ith.change_type = 'delete' then 'deleted'
    when ith.change_type = 'update' then 'updated'
    else ith.change_type
  end::text as change_type,
  coalesce(ith.project_id, ith.old_project_id) as project_id,
  coalesce(ith.project_name, p.name) as project_name,
  coalesce(ith.old_building_id, ith.building_id) as building_id,
  coalesce(ith.old_building_name, ith.building_name, pb.name) as building_name,
  coalesce(ith.amount, ith.old_amount) as amount,
  coalesce(ith.currency, ith.old_currency, 'USD') as currency,
  coalesce(ith.amount_usd, ith.old_amount_usd, case when coalesce(ith.currency, ith.old_currency) = 'USD' then coalesce(ith.amount, ith.old_amount) else 0 end, 0)::numeric as amount_usd,
  coalesce(ith.amount_iqd, ith.old_amount_iqd, case when coalesce(ith.currency, ith.old_currency) = 'IQD' then coalesce(ith.amount, ith.old_amount) else 0 end, 0)::numeric as amount_iqd,
  coalesce(ith.description, ith.old_description) as description,
  coalesce(ith.date, ith.old_date) as date,
  coalesce(ith.record_status, 'active') as record_status,
  ith.changed_by,
  coalesce(changed_profile.full_name, changed_profile.email::text) as changed_by_name,
  ith.changed_at
from public.income_transaction_history as ith
left join public.projects as p
  on p.id = coalesce(ith.project_id, ith.old_project_id)
left join public.project_buildings as pb
  on pb.id = coalesce(ith.old_building_id, ith.building_id)
left join public.profiles as changed_profile
  on changed_profile.id = ith.changed_by;

grant select on
  public.app_income_transactions,
  public.app_income_transaction_history
to authenticated;

notify pgrst, 'reload schema';
