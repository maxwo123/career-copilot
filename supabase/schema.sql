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
    ('resume', 'cover_letter', 'interview_prep', 'match_analysis', 'other')),
  title text not null default '',
  content_md text not null default '',
  version int not null default 1,
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

do $$
declare t text;
begin
  foreach t in array array['profile', 'profile_entries', 'jobs', 'documents', 'activity'] loop
    execute format('create policy "auth full access" on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;
