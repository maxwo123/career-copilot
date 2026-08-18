-- Notion-lite blocks replace flat action items: the dashboard becomes a
-- block document where text notes and checkable tasks interleave freely.
create table if not exists coach_blocks (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'text' check (kind in ('text', 'task')),
  content text not null default '',  -- multiline; first line reads as the block's lead
  checked boolean not null default false, -- tasks only
  sort_order double precision not null default 0, -- float so inserts land between neighbors
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table coach_blocks enable row level security;
create policy "auth full access" on coach_blocks
  for all to authenticated using (true) with check (true);

-- Migrate existing action items into task blocks (dismissed ones drop out).
insert into coach_blocks (kind, content, checked, sort_order, created_at)
select
  'task',
  title
    || case when due_on is not null then ' (due ' || to_char(due_on, 'Mon DD') || ')' else '' end
    || case when detail <> '' then e'\n' || detail else '' end
    || case when url <> '' then e'\n' || url else '' end,
  status = 'done',
  row_number() over (order by sort_order, created_at),
  created_at
from action_items
where status <> 'dismissed';

drop table action_items;
