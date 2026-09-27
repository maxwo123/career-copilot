-- The server stores ciphertext only. The unlock key is derived in the browser.
create table public.credential_vault_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  salt text not null,
  verifier_iv text not null,
  verifier_ciphertext text not null,
  created_at timestamptz not null default now()
);

create table public.credential_vault_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  iv text not null,
  ciphertext text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index credential_vault_items_user_id_idx on public.credential_vault_items(user_id);

alter table public.credential_vault_settings enable row level security;
alter table public.credential_vault_items enable row level security;
revoke all on public.credential_vault_settings from anon, authenticated;
revoke all on public.credential_vault_items from anon, authenticated;
grant select, insert, delete on public.credential_vault_settings to authenticated;
grant select, insert, update, delete on public.credential_vault_items to authenticated;

create policy "vault settings select owner" on public.credential_vault_settings
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "vault settings insert owner" on public.credential_vault_settings
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "vault settings delete owner" on public.credential_vault_settings
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "vault items select owner" on public.credential_vault_items
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "vault items insert owner" on public.credential_vault_items
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "vault items update owner" on public.credential_vault_items
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "vault items delete owner" on public.credential_vault_items
  for delete to authenticated using ((select auth.uid()) = user_id);
