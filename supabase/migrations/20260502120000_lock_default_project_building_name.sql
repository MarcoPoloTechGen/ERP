-- Keep the reserved per-project default building stable and non-editable.

alter table public.project_buildings
  add column if not exists is_default boolean not null default false;

with ranked_defaults as (
  select
    id,
    row_number() over (partition by project_id order by created_at, id) as default_rank
  from public.project_buildings
  where coalesce(is_default, false) = true
)
update public.project_buildings as pb
set is_default = false
from ranked_defaults as rd
where pb.id = rd.id
  and rd.default_rank > 1;

update public.project_buildings
set
  name = 'تێچوی گشتی ',
  is_default = true
where coalesce(is_default, false) = true
  or btrim(name) = 'Depenses generales';

with ranked_defaults as (
  select
    id,
    row_number() over (partition by project_id order by created_at, id) as default_rank
  from public.project_buildings
  where coalesce(is_default, false) = true
)
update public.project_buildings as pb
set is_default = false
from ranked_defaults as rd
where pb.id = rd.id
  and rd.default_rank > 1;

delete from public.project_buildings
where coalesce(is_default, false) = false
  and btrim(name) in ('Depenses generales', btrim('تێچوی گشتی '));

insert into public.project_buildings (project_id, name, is_default)
select p.id, 'تێچوی گشتی ', true
from public.projects as p
where not exists (
  select 1
  from public.project_buildings as pb
  where pb.project_id = p.id
    and coalesce(pb.is_default, false) = true
);

create unique index if not exists project_buildings_one_default_per_project
on public.project_buildings (project_id)
where is_default = true;

create or replace function public.replace_project_buildings(
  p_project_id bigint,
  p_building_names text[]
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  default_project_building_name constant text := 'تێچوی گشتی ';
  cleaned_names text[];
begin
  if not public.is_admin() then
    raise exception 'Only administrators can update project buildings.';
  end if;

  cleaned_names := array(
    select distinct trimmed_name
    from (
      select nullif(btrim(name), '') as trimmed_name
      from unnest(coalesce(p_building_names, array[]::text[])) as name
    ) as prepared_names
    where trimmed_name is not null
      and lower(trimmed_name) <> lower(btrim(default_project_building_name))
      and lower(trimmed_name) <> lower('Depenses generales')
    order by trimmed_name
  );

  update public.project_buildings
  set name = default_project_building_name
  where project_id = p_project_id
    and coalesce(is_default, false) = true;

  insert into public.project_buildings (project_id, name, is_default)
  select p_project_id, default_project_building_name, true
  where not exists (
    select 1
    from public.project_buildings
    where project_id = p_project_id
      and coalesce(is_default, false) = true
  );

  delete from public.project_buildings
  where project_id = p_project_id
    and coalesce(is_default, false) = false;

  insert into public.project_buildings (project_id, name, is_default)
  select p_project_id, building_names.name, false
  from unnest(cleaned_names) as building_names(name)
  where not exists (
    select 1
    from public.project_buildings as existing_buildings
    where existing_buildings.project_id = p_project_id
      and lower(existing_buildings.name) = lower(building_names.name)
  );
end;
$$;

create or replace function public.prevent_default_project_building_changes()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  default_project_building_name constant text := 'تێچوی گشتی ';
begin
  if tg_op = 'DELETE' then
    if coalesce(old.is_default, false) = true then
      raise exception 'The default project building cannot be deleted.';
    end if;

    return old;
  end if;

  if coalesce(new.is_default, false) = false
    and btrim(new.name) in ('Depenses generales', btrim(default_project_building_name)) then
    raise exception 'The default project building name is reserved.';
  end if;

  if tg_op = 'UPDATE'
    and coalesce(old.is_default, false) = true
    and (
      new.project_id is distinct from old.project_id
      or coalesce(new.is_default, false) is distinct from true
      or btrim(new.name) <> btrim(default_project_building_name)
    ) then
    raise exception 'The default project building cannot be modified.';
  end if;

  if coalesce(new.is_default, false) = true then
    new.name := default_project_building_name;
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_default_project_building_changes on public.project_buildings;
create trigger prevent_default_project_building_changes
before insert or update or delete on public.project_buildings
for each row
execute function public.prevent_default_project_building_changes();

notify pgrst, 'reload schema';
