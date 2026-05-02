-- The current income history trigger writes created/updated/deleted.
-- Keep legacy update/delete rows valid while allowing new trigger rows.

alter table public.income_transaction_history
  drop constraint if exists income_transaction_history_change_type_check;

alter table public.income_transaction_history
  add constraint income_transaction_history_change_type_check
  check (change_type in ('created', 'updated', 'deleted', 'update', 'delete'));

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
  coalesce(
    ith.amount_usd,
    ith.old_amount_usd,
    case when coalesce(ith.currency, ith.old_currency) = 'USD' then coalesce(ith.amount, ith.old_amount) else 0 end,
    0
  )::numeric as amount_usd,
  coalesce(
    ith.amount_iqd,
    ith.old_amount_iqd,
    case when coalesce(ith.currency, ith.old_currency) = 'IQD' then coalesce(ith.amount, ith.old_amount) else 0 end,
    0
  )::numeric as amount_iqd,
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

notify pgrst, 'reload schema';
