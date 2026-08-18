# Career Copilot

Single-user job-application tracker where **Claude Code is the AI engine** —
no OpenAI/Gemini API keys. The website stores your master profile, job
postings (link + pasted description), application statuses, and generated
documents. Claude Code connects through the app's own MCP endpoint
(`/api/mcp`) and, using its installed resume skills, tailors resumes, cover
letters, match analyses, and interview prep — saving them back into the app
where you view and print them.

## How it works

1. **Profile** — fill in your master profile once: contact info plus entries
   for education, experience, projects, leadership, skills, certifications.
   Include everything; tailoring means cutting, not inventing.
2. **Add jobs** — paste the posting link *and the full job description*
   (Handshake etc. are behind logins, so the text must travel with the link).
3. **Ask Claude** — in Claude Code: *"Tailor a resume for the Stripe job in
   Career Copilot."* Claude reads the JD + your profile via MCP, runs its
   resume skills, and saves the document back.
4. **Review & print** — open the document on the site; *Print / Save as PDF*
   uses print-optimized styling.
5. **Track** — statuses flow saved → applied → interviewing → offer /
   rejected / withdrawn. The dashboard groups jobs, flags upcoming
   deadlines, and shows an activity feed of what Claude did.
6. **Applications** — `/applications` gathers everything job-application
   related: the pipeline stats, upcoming deadlines, tracked jobs grouped by
   status, and the application timeline (when each company's window opens,
   grouped by month with "Open now" highlighting — renamed from /timeline,
   which redirects). Ask your agentic tool of choice to research companies'
   hiring cycles and import events via MCP (`upsert_timeline_event`). One
   click promotes a timeline event into a tracked job.
7. **Career coach** — three pillars beyond documents: a **career narrative**
   (hidden, MCP-only coach memory — no UI; connected AIs load it via
   `get_career_narrative` before any career question, run a first-time
   guided interview when it's empty, and merge refinements back after every
   meaningful conversation, so the picture progresses over time and carries
   across AI tools), **Notes & actions sections** on the dashboard (each a
   bold title + free-text body where lines typed as "[] task" become
   checkable to-dos and "[x]" renders done; long bodies collapse to fading
   previews — AI-composed via `upsert_note`, checked off by the user), and
   **industry briefings** (doc type `briefing`: AI-curated news written at
   the comprehension level recorded in the narrative). The MCP `initialize`
   instructions + tool descriptions + a cross-nudge in `get_profile` teach
   any connected agent this protocol; if the user asks what the AI knows
   about them, it shares the narrative openly.

## Stack

- **Next.js (App Router)** on **Vercel**
- **Supabase** — auth (single user), Postgres, row-level security
- **MCP endpoint** — stateless streamable-HTTP JSON-RPC at `/api/mcp`,
  bearer-token auth (`MCP_TOKEN`)

## Setup

1. Create a Supabase project and run `supabase/schema.sql` in the SQL editor.
2. `cp .env.example .env.local` and fill in the Supabase URL/keys and an
   `MCP_TOKEN` (any long random string).
3. `npm install && npm run dev`, open http://localhost:3000, click
   **"First time? Create the account"** once — that's your login.
4. Set the same four env vars on Vercel and deploy.

## Connecting your AI

The in-app `/connect` page shows ready-to-copy instructions. Two endpoints,
same server (`src/lib/mcp-server.ts`):

- **CLI agents** (can send headers):

  ```bash
  claude mcp add --transport http career-copilot https://<your-app>/api/mcp \
    --header "Authorization: Bearer <MCP_TOKEN>"
  ```

- **claude.ai / ChatGPT custom connectors** (authless/OAuth only — no custom
  headers): use the token-in-path URL `https://<your-app>/api/mcp/<MCP_TOKEN>`.
  Claude: Settings → Connectors → Add custom connector (works on mobile once
  added). ChatGPT: Settings → Apps → Developer mode (Plus/Pro+; write tools
  may be limited). The URL is the secret — treat it like a password.

MCP tools: `get_career_narrative`, `update_career_narrative`,
`list_notes`, `upsert_note`, `delete_note`,
`get_profile`, `update_profile`, `upsert_profile_entry`,
`delete_profile_entry`, `list_jobs`, `get_job`, `add_job`, `update_job`,
`list_timeline`, `upsert_timeline_event`, `delete_timeline_event`,
`save_document`, `list_documents`, `get_document`.

Useful prompts:

- "Import my resume into my Career Copilot profile" (paste the resume text)
- "What jobs in my tracker still need documents?"
- "Analyze my fit for the &lt;company&gt; job, then tailor a resume and cover
  letter for it"
- "Mark the &lt;company&gt; job as applied"
- "Research when big pharma / healthcare ML summer internships open and
  build my application timeline in Career Copilot"
- "Interview me and fill in my career narrative in Career Copilot"
- "What should I be working on? Check my narrative and action items"
- "Research this week's news for my target industry and save me a briefing
  at my level"

## Project context (for new Claude Code sessions)

Everything below is the live state of this deployment — enough to pick up
work in a fresh chat without re-discovering it.

- **Live app:** https://career-copilot-lemon-theta.vercel.app
- **Vercel:** project `career-copilot` (team `maxs-projects-7003fe5c`).
  Deploy with `vercel deploy --prod --yes` from the repo root.
- **Workflow rule: deploy after every change.** Whenever code changes are
  made (by Claude or otherwise), finish by running
  `vercel deploy --prod --yes` so the live app always matches the repo.
- **Supabase:** project `career-copilot`, ref `gqwcxneilcdogfrvdhkw`
  (personal org). Schema lives in `supabase/schema.sql` (mirrored as the
  initial migration in `supabase/migrations/`); change it by adding a new
  migration and running `supabase db push -p "$SUPABASE_DB_PASSWORD"`.
- **Secrets:** all in the gitignored `.env.local` (Supabase URL/keys,
  `MCP_TOKEN`, `SUPABASE_DB_PASSWORD`) and mirrored in Vercel production
  env vars. Never committed.
- **MCP:** registered in Claude Code at user scope as `career-copilot`
  (11 tools). If it's missing, re-register with the command above.
- **History:** built 2026-08-16 as a restart of two earlier projects — the
  "Handshake Scalper" Python/Gemini CLI and the "Jop Application"
  Next.js/Supabase app (whose paused Supabase project is unrelated to this
  one). AI features intentionally use no LLM API keys: Claude Code + its
  installed resume skills (`~/.claude/skills/`) are the engine.
- **Data state:** profile populated from `Master CV.pdf` (Job Applications
  folder on Desktop); initial jobs migrated from the Notion "Job
  Applications" database with JDs fetched from the public postings.
  Timeline seeded 2026-08-16 with the summer-2027 healthcare/biotech
  internship cycle (Prep build phase, AstraZeneca, Pfizer, Roche,
  Genentech, Broad BSRP, NIH SIP) from Max's screenshots + web research.

### Code map

- `src/app/api/mcp/route.ts` — the MCP server (stateless JSON-RPC, bearer
  auth). Add new tools here.
- `src/app/actions.ts` / `src/app/auth-actions.ts` — server actions
  (jobs/profile CRUD; single-user auth bootstrap).
- `src/app/(app)/` — dashboard, `jobs/new`, `jobs/[id]`, `profile`,
  `documents/[id]` (print-CSS document viewer).
- `src/lib/` — Supabase clients (`client`/`server`/`service`), shared
  `types.ts`, UI helpers (`ui.tsx`).
- `src/proxy.ts` — auth middleware (public paths: `/login`, `/api/mcp`).
