-- Application timelines: when companies' internship/job postings open, so the
-- candidate applies in week one. Populated mostly by AI agents (Claude Code /
-- Codex) doing research via the MCP endpoint; the site renders the timeline.
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

alter table timeline_events enable row level security;
create policy "auth full access" on timeline_events
  for all to authenticated using (true) with check (true);
