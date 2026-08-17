-- Career-coach foundation: the durable "who am I, where am I going" record
-- that any connected AI reads before giving guidance, plus coach-assigned
-- action items, plus a 'briefing' document type for AI-curated industry news.

-- One-row table: the career narrative. AI tools read this FIRST to get a
-- holistic picture, and write refinements back after guidance conversations.
create table if not exists career_narrative (
  id uuid primary key default gen_random_uuid(),
  starting_point text not null default '', -- where they began: background, first exposures
  current_state text not null default '',  -- where they are now: skills, experience, knowledge level
  goals text not null default '',          -- where they're headed: target roles, industry, timeframe
  interests text not null default '',      -- what pulls them: topics, problems, environments
  constraints_text text not null default '',-- realities: time, location, finances, visa, GPA
  gap_analysis text not null default '',   -- what stands between current_state and goals
  coach_notes text not null default '',    -- AI-maintained observations that persist across tools/sessions
  updated_at timestamptz not null default now()
);

-- Coach-assigned next steps shown on the dashboard: learn X, read Y, apply to Z.
create table if not exists action_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  detail text not null default '',
  category text not null default 'other' check (category in
    ('skill', 'knowledge', 'apply', 'document', 'other')),
  status text not null default 'open' check (status in ('open', 'done', 'dismissed')),
  due_on date,
  url text not null default '',
  source text not null default 'claude' check (source in ('user', 'claude')),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- Documents gain the 'briefing' type (AI-curated industry news at the
-- reader's current comprehension level).
alter table documents drop constraint if exists documents_doc_type_check;
alter table documents add constraint documents_doc_type_check check (doc_type in
  ('resume', 'cover_letter', 'interview_prep', 'match_analysis', 'briefing', 'other'));

alter table career_narrative enable row level security;
alter table action_items enable row level security;
create policy "auth full access" on career_narrative
  for all to authenticated using (true) with check (true);
create policy "auth full access" on action_items
  for all to authenticated using (true) with check (true);
