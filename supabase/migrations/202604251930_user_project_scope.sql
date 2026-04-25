alter table public.profiles
  add column if not exists selected_project_id bigint references public.projects(id) on delete set null;
