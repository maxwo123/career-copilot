# Career Copilot

Single-user career-growth tracker where **your own AI tools are the engine**
— the app itself has no AI and holds no LLM API keys, so there is nothing to
meter or subscribe to. Any MCP-capable assistant (Claude, ChatGPT, Gemini,
Claude Code, Codex CLI, Gemini CLI, ...) connects through the app's own MCP
endpoint (`/api/mcp`) and becomes the intelligence layer: it reads your
career narrative, master profile, and saved jobs, then writes guidance,
action items, tailored resumes/cover letters, and industry briefings back
into the app where you view and print them.

## How it works

1. **Profile** — fill in your master profile once: contact info plus entries
   for education, experience, projects, leadership, skills, certifications.
   Include everything; tailoring means cutting, not inventing.
2. **Add jobs** — paste the posting link *and the full job description*
   (Handshake etc. are behind logins, so the text must travel with the link).
3. **Ask your AI** — in any connected tool: *"Tailor a resume for the Stripe
   job in Career Copilot."* The AI reads the JD + your profile via MCP and
   saves the document back.
4. **Review & print** — open the document on the site; *Print / Save as PDF*
   uses print-optimized styling.
5. **Track** — statuses flow saved → applied → interviewing → offer /
   rejected / withdrawn. The dashboard groups jobs, flags upcoming
   deadlines, and shows an activity feed of what your AI did.
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
   across AI tools), **Notes & actions** on the dashboard — a month-grouped
   timeline (same rail UI as the application timeline) of action-item cards:
   bold title on its own line, then a text-editor body mixing explanations,
   hyperlinks, and "[] task" checkbox lines; cards are collapsed by default
   (title + to-do count + faded preview) and expand to full height —
   AI-composed via `upsert_note` (with a target `month`), checked off by
   the user — and
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

## Connecting your AI (any MCP-capable tool)

The server is a standard **stateless streamable-HTTP MCP server** — any
client that speaks MCP over streamable HTTP works. The in-app **Getting
started** guide (`/guide`) is a full tutorial with a docs-style sidebar;
`/guide/connect` shows ready-to-copy connection instructions with your live
URLs. Two endpoints, same server
(`src/lib/mcp-server.ts`):

- **Header auth** (for clients that can send custom headers — most CLIs):
  `https://<your-app>/api/mcp` with `Authorization: Bearer <MCP_TOKEN>`.

  ```bash
  # Claude Code
  claude mcp add --transport http career-copilot https://<your-app>/api/mcp \
    --header "Authorization: Bearer <MCP_TOKEN>"
  # Gemini CLI
  gemini mcp add --transport http career-copilot https://<your-app>/api/mcp \
    --header "Authorization: Bearer <MCP_TOKEN>"
  ```

- **Token-in-path URL** (for consumer apps whose connectors only support
  authless/OAuth servers and can't send headers):
  `https://<your-app>/api/mcp/<MCP_TOKEN>` — the URL itself is the secret,
  treat it like a password.
  - **Claude** (web/desktop): Settings → Connectors → Add custom connector
    (works on mobile once added).
  - **ChatGPT** (Plus/Pro+): Settings → Apps → Advanced → Developer mode →
    add MCP server (write tools may be limited on Plus/Pro).
  - **Gemini**: the consumer web app doesn't expose custom MCP connectors
    yet — use Gemini CLI (above) or a Gemini Enterprise custom MCP
    connection (Streamable HTTP), which this server satisfies.
  - **Anything else**: paste the same URL into any MCP-compatible client;
    no OAuth flow is required.

- **JSON configuration** (Claude Code `.mcp.json`, Gemini CLI
  `settings.json`, Cursor `mcp.json`, ...): no LLM API key is needed — the
  AI tool brings its own model; the only credential is `MCP_TOKEN`.

  ```json
  {
    "mcpServers": {
      "career-copilot": {
        "type": "http",
        "url": "https://<your-app>/api/mcp",
        "headers": { "Authorization": "Bearer <MCP_TOKEN>" }
      }
    }
  }
  ```

  If the tool's config has no `headers` field, set `url` to the
  token-in-path endpoint instead; for stdio-only configs, bridge with
  `"command": "npx", "args": ["-y", "mcp-remote", "<token-in-path URL>"]`.
  Exact per-tool JSON lives in the in-app guide at `/guide/connect`.

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
  (19 tools). If it's missing, re-register with the command above. Other
  tools connect the same way (header auth) or via the token-in-path URL.
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

- `src/lib/mcp-server.ts` — the MCP server (stateless JSON-RPC). Add new
  tools here. Thin route wrappers: `src/app/api/mcp/route.ts` (header auth)
  and `src/app/api/mcp/[token]/route.ts` (token-in-path).
- `src/app/actions.ts` / `src/app/auth-actions.ts` — server actions
  (jobs/profile CRUD; single-user auth bootstrap).
- `src/app/(app)/` — dashboard, `jobs/new`, `jobs/[id]`, `profile`,
  `documents/[id]` (print-CSS document viewer).
- `src/lib/` — Supabase clients (`client`/`server`/`service`), shared
  `types.ts`, UI helpers (`ui.tsx`).
- `src/proxy.ts` — auth middleware (public paths: `/login`, `/api/mcp`).
