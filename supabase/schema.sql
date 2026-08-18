-- Career Copilot schema (single-user job application tracker).
-- Run once against the Supabase project (SQL editor or supabase db push).

-- One-row table: the master profile header (contact info + summary).
create table if not exists profile (
  id uuid primary key default gen_random_uuid(),
  full_name text not null default '',
  email text not null default '',
  phone text not null default '',
  location text not null default '',
  linkedin_url text not null default '',
  github_url text not null default '',
  website_url text not null default '',
  summary text not null default '', -- professional summary / objective
  updated_at timestamptz not null default now()
);

-- Structured resume sections: one row per entry (a degree, a job, a project...).
create table if not exists profile_entries (
  id uuid primary key default gen_random_uuid(),
  section text not null check (section in
    ('education', 'experience', 'projects', 'leadership', 'skills', 'certifications', 'other')),
  title text not null default '',        -- degree, role, project name, or skill-group label
  organization text not null default '', -- school, company, club
  location text not null default '',
  date_range text not null default '',   -- free text: "Aug 2024 – May 2028"
  description text not null default '',  -- bullets, one per line (or comma list for skills)
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  title text not null,
  url text not null default '',
  source text not null default '',   -- Handshake, LinkedIn, company site...
  location text not null default '',
  jd_text text not null default '',  -- pasted job description
  status text not null default 'saved' check (status in
    ('saved', 'applied', 'interviewing', 'offer', 'rejected', 'withdrawn')),
  deadline date,
  applied_at timestamptz,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Generated artifacts (tailored resumes, cover letters, prep docs) as Markdown.
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs(id) on delete cascade, -- null = general (e.g. master resume)
  doc_type text not null check (doc_type in
    ('resume', 'cover_letter', 'interview_prep', 'match_analysis', 'briefing', 'other')),
  title text not null default '',
  content_md text not null default '',
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

-- Notion-lite blocks: the dashboard "Notes & actions" document, where text
-- notes and checkable tasks interleave freely (AI-composed via MCP).
create table if not exists coach_blocks (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'text' check (kind in ('text', 'task')),
  content text not null default '',  -- multiline; first line reads as the block's lead
  checked boolean not null default false, -- tasks only
  sort_order double precision not null default 0, -- float so inserts land between neighbors
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Application timelines: when companies' internship/job postings open, so the
-- candidate applies in week one. Populated mostly by AI agents via MCP.
create table if not exists timeline_events (
  id uuid primary key default gen_random_uuid(),
  company text not null,                 -- "Genentech", "NIH", or "Prep" for personal milestones
  program text not null default '',      -- program/role name: "Summer Internship Program (SIP)"
  window_label text not null default '', -- human label: "Nov 2026 – Mar 2027 (rolling)"
  starts_on date,                        -- approximate window open, used for ordering/grouping
  ends_on date,                          -- approximate close / deadline
  url text not null default '',
  notes text not null default '',        -- why it matters, eligibility, apply-week-one tips
  job_id uuid references jobs(id) on delete set null, -- linked once tracked as a real job
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Feed of what happened (especially what Claude did via MCP).
create table if not exists activity (
  id uuid primary key default gen_random_uuid(),
  actor text not null default 'claude' check (actor in ('user', 'claude')),
  action text not null,
  detail text not null default '',
  job_id uuid references jobs(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Single-user app: any authenticated user has full access; anon has none.
alter table profile enable row level security;
alter table profile_entries enable row level security;
alter table jobs enable row level security;
alter table documents enable row level security;
alter table activity enable row level security;
alter table timeline_events enable row level security;
alter table career_narrative enable row level security;
alter table coach_blocks enable row level security;

do $$
declare t text;
begin
  foreach t in array array['profile', 'profile_entries', 'jobs', 'documents', 'activity', 'timeline_events', 'career_narrative', 'coach_blocks'] loop
    execute format('create policy "auth full access" on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;
