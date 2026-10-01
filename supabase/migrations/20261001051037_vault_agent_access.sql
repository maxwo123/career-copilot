-- The user explicitly enables ongoing MCP access by sharing the derived vault
-- key with the server. The key is wrapped before storage; disabling deletes it.
create table public.credential_vault_agent_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  wrapped_key_iv text not null,
  wrapped_key_ciphertext text not null,
  created_at timestamptz not null default now()
);

alter table public.credential_vault_agent_access enable row level security;
revoke all on public.credential_vault_agent_access from anon, authenticated;
grant select, insert, update, delete on public.credential_vault_agent_access to authenticated;

create policy "vault agent access select owner" on public.credential_vault_agent_access
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "vault agent access insert owner" on public.credential_vault_agent_access
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "vault agent access update owner" on public.credential_vault_agent_access
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "vault agent access delete owner" on public.credential_vault_agent_access
  for delete to authenticated using ((select auth.uid()) = user_id);
