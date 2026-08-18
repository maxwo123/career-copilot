-- Notes & actions v2: titled sections instead of a flat block stream.
-- Each note = bold title + free-text body; body lines starting with
-- "[ ] " / "[x] " render as checkable to-dos (markdown-task style, so AI
-- tools compose them naturally).
create table if not exists coach_notes (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  body text not null default '',  -- multiline; "[ ] task" / "[x] done" lines are checkboxes
  sort_order double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table coach_notes enable row level security;
create policy "auth full access" on coach_notes
  for all to authenticated using (true) with check (true);

-- Migrate blocks: first line becomes the title (unless it's a long text
-- paragraph), the rest becomes the body; task blocks gain a checkbox line
-- carrying their checked state.
insert into coach_notes (title, body, sort_order, created_at)
select
  case
    when kind = 'text' and length(split_part(content, e'\n', 1)) > 90 then ''
    else split_part(content, e'\n', 1)
  end,
  case
    when kind = 'text' and length(split_part(content, e'\n', 1)) > 90 then content
    else regexp_replace(content, '^[^\n]*\n?', '')
  end
    || case
         when kind = 'task' then
           case when regexp_replace(content, '^[^\n]*\n?', '') = '' then '' else e'\n' end
             || case when checked then '[x] Done' else '[ ] Done' end
         else ''
       end,
  sort_order,
  created_at
from coach_blocks
order by sort_order;

drop table coach_blocks;
