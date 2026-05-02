-- Allow income transaction history rows to be written by the
-- income_transactions history trigger under the source project scope.

alter table public.income_transaction_history enable row level security;

drop policy if exists "income transaction history authenticated insert" on public.income_transaction_history;
create policy "income transaction history authenticated insert"
on public.income_transaction_history
for insert
to authenticated
with check (public.can_access_project(project_id));

notify pgrst, 'reload schema';
