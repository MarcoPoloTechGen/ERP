-- New expenses and worker/supplier transactions must be assigned to a concrete
-- project building. The project is derived from project_buildings.project_id.

alter table if exists public.party_transactions
  add column if not exists building_id bigint references public.project_buildings(id) on delete set null;

alter table if exists public.party_transactions
  drop constraint if exists party_transactions_building_required;

alter table if exists public.party_transactions
  add constraint party_transactions_building_required
  check (building_id is not null)
  not valid;

comment on constraint party_transactions_building_required on public.party_transactions
  is 'Requires every new expense or worker/supplier transaction to be linked to a project building.';

notify pgrst, 'reload schema';
