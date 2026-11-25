create table public.personal_context_sections (
  user_id uuid not null references auth.users (id) on delete cascade,
  section text not null check (section in ('about', 'goals', 'projects', 'resume', 'preferences', 'people', 'logistics')),
  markdown text not null default '' check (char_length(markdown) <= 20000),
  shared boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, section)
);

alter table public.personal_context_sections enable row level security;

revoke all on public.personal_context_sections from anon, authenticated;
grant select, insert, update on public.personal_context_sections to authenticated;
grant select on public.personal_context_sections to service_role;

create policy personal_context_owner on public.personal_context_sections
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
