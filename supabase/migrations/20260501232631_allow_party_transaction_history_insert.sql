-- Allow transaction history rows to be written by the party_transactions
-- history trigger under the same project/admin scope as the source transaction.

alter table public.party_transaction_history enable row level security;

drop policy if exists "party transaction history scoped insert" on public.party_transaction_history;
create policy "party transaction history scoped insert"
on public.party_transaction_history
for insert
to authenticated
with check (
  public.fn_get_role() = any (array['super_admin'::text, 'admin'::text])
  or exists (
    select 1
    from public.project_buildings as pb
    join public.project_memberships as pm
      on pm.project_id = pb.project_id
    where pb.id = party_transaction_history.old_building_id
      and pm.user_id = auth.uid()
  )
);

notify pgrst, 'reload schema';
