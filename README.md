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

## Connecting Claude Code

```bash
claude mcp add --transport http career-copilot https://<your-app>/api/mcp \
  --header "Authorization: Bearer <MCP_TOKEN>"
```

MCP tools: `get_profile`, `update_profile`, `upsert_profile_entry`,
`delete_profile_entry`, `list_jobs`, `get_job`, `add_job`, `update_job`,
`save_document`, `list_documents`, `get_document`.

Useful prompts:

- "Import my resume into my Career Copilot profile" (paste the resume text)
- "What jobs in my tracker still need documents?"
- "Analyze my fit for the &lt;company&gt; job, then tailor a resume and cover
  letter for it"
- "Mark the &lt;company&gt; job as applied"
