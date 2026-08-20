import Link from "next/link";
import type { ReactNode } from "react";

// The guide's content registry. Each doc renders in /guide/[slug] with the
// sidebar alongside. Body components receive the live MCP endpoint values.

export interface DocProps {
  origin: string;
  token: string;
  connectorUrl: string;
}

export interface GuideDoc {
  slug: string;
  group: string;
  title: string;
  description: string;
  Body: (props: DocProps) => ReactNode;
}

/* ---------- prose primitives ---------- */

function H2({ children }: { children: ReactNode }) {
  return (
    <h2 className="mt-8 mb-3 text-lg font-semibold tracking-tight text-stone-900">
      {children}
    </h2>
  );
}

function P({ children }: { children: ReactNode }) {
  return <p className="mb-3 text-sm leading-relaxed text-stone-600">{children}</p>;
}

function Ul({ children }: { children: ReactNode }) {
  return (
    <ul className="mb-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-stone-600">
      {children}
    </ul>
  );
}

function Ol({ children }: { children: ReactNode }) {
  return (
    <ol className="mb-3 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-stone-600">
      {children}
    </ol>
  );
}

function B({ children }: { children: ReactNode }) {
  return <span className="font-medium text-stone-800">{children}</span>;
}

function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-md bg-stone-100 px-1.5 py-0.5 font-mono text-xs">
      {children}
    </code>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="mb-3 overflow-x-auto rounded-lg border border-stone-200 bg-stone-50 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-stone-700">
      {children}
    </pre>
  );
}

function A({ href, children }: { href: string; children: ReactNode }) {
  const external = href.startsWith("http");
  const cls =
    "font-medium text-indigo-600 underline underline-offset-2 hover:text-indigo-700";
  return external ? (
    <a href={href} target="_blank" rel="noreferrer" className={cls}>
      {children}
    </a>
  ) : (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

function Prompt({ children }: { children: string }) {
  return (
    <li className="mb-1.5">
      <code className="rounded-md bg-stone-100 px-1.5 py-0.5 font-mono text-xs leading-relaxed">
        {children}
      </code>
    </li>
  );
}

/* ---------- docs ---------- */

export const DOCS: GuideDoc[] = [
  {
    slug: "overview",
    group: "Get started",
    title: "Overview",
    description:
      "What Career Copilot is, and why it works with any AI tool you already use.",
    Body: () => (
      <>
        <P>
          Career Copilot is a personal career-growth workspace. It stores your
          master profile, job applications, generated documents, action items,
          and hiring timelines — and it deliberately contains <B>no AI of its
          own</B>. Instead, the AI tools you already pay for (Claude, ChatGPT,
          Gemini, or CLI agents like Claude Code, Gemini CLI, and Codex)
          connect through an open MCP endpoint and become the intelligence
          layer. No API keys, no metering, no extra subscription.
        </P>
        <H2>The three pillars</H2>
        <Ul>
          <li>
            <B>Direction</B> — a private career narrative your AI maintains
            behind the scenes, plus month-by-month action items on the{" "}
            <A href="/">dashboard</A>: skills to learn, articles to read,
            opportunities to pursue.
          </li>
          <li>
            <B>Applications</B> — the <A href="/applications">pipeline</A>:
            tracked jobs, deadlines, and a timeline of when each company&apos;s
            application window opens so you apply in week one.
          </li>
          <li>
            <B>Documents</B> — tailored resumes, cover letters, interview
            prep, and industry briefings your AI writes into the app, where
            you review and print them.
          </li>
        </Ul>
        <H2>How it fits together</H2>
        <P>
          You chat with your AI wherever you normally do. When the
          conversation touches your career, the AI reads your context from
          Career Copilot, does its research or writing, and saves results
          back — so the app is the durable memory that every AI tool shares.
          Start with the <A href="/guide/quickstart">Quickstart</A>.
        </P>
      </>
    ),
  },
  {
    slug: "quickstart",
    group: "Get started",
    title: "Quickstart",
    description: "From zero to a tailored resume in about fifteen minutes.",
    Body: () => (
      <>
        <Ol>
          <li>
            <B>Create your account.</B> On the login page, enter an email and
            password and click <Code>First time? Create the account</Code> —
            this single-user app has exactly one login: yours.
          </li>
          <li>
            <B>Connect an AI.</B> Follow{" "}
            <A href="/guide/connect">Connect your AI</A> — usually one
            copy-paste into your AI tool&apos;s connector settings.
          </li>
          <li>
            <B>Let it interview you.</B> Ask your AI:{" "}
            <Code>What should I be working on in Career Copilot?</Code> On
            first contact it will offer a short guided interview (about five
            minutes) and then seed your dashboard with starter action items.
          </li>
          <li>
            <B>Fill your profile.</B> Paste your existing resume into the
            chat and say{" "}
            <Code>Import my resume into my Career Copilot profile</Code>, then
            tidy it up on the <A href="/profile">Profile</A> page. Include
            everything — tailoring means cutting, not inventing.
          </li>
          <li>
            <B>Add a job and tailor.</B> Add a posting (paste the full job
            description — most boards sit behind logins, so the text must
            travel with the link), then ask:{" "}
            <Code>Tailor a resume for the &lt;company&gt; job in Career
            Copilot</Code>. Review and print it from the document page.
          </li>
          <li>
            <B>Optional but powerful:</B> ask your AI to research when your
            target companies&apos; internship or job windows open and build
            your <A href="/applications">application timeline</A>, and set a
            weekly scheduled task in your AI tool for an industry briefing.
          </li>
        </Ol>
      </>
    ),
  },
  {
    slug: "connect",
    group: "Get started",
    title: "Connect your AI",
    description:
      "One MCP server, two endpoints — works with any MCP-capable assistant.",
    Body: ({ origin, token, connectorUrl }) => (
      <>
        <P>
          The server speaks standard <B>MCP over Streamable HTTP</B>, so any
          MCP-capable client can connect. Two endpoints, same server — pick
          the one your tool supports:
        </P>
        <H2>Endpoint 1: connector URL (no headers needed)</H2>
        <P>
          For consumer apps whose connectors support only authless or OAuth
          servers. The URL itself is the credential — treat it like a
          password.
        </P>
        <CodeBlock>{connectorUrl}</CodeBlock>
        <Ul>
          <li>
            <B>Claude</B> (web/desktop): Settings → Connectors → Add custom
            connector → paste the URL. Works in the mobile apps once added.
          </li>
          <li>
            <B>ChatGPT</B> (Plus/Pro and up): Settings → Apps → Advanced
            settings → enable Developer mode → add an MCP server with the
            URL. Write tools may be limited on Plus/Pro plans.
          </li>
          <li>
            <B>Gemini</B>: the consumer web app doesn&apos;t expose custom
            MCP connectors yet; use Gemini CLI (below) or a Gemini Enterprise
            custom MCP connection pointed at this URL.
          </li>
          <li>
            <B>Any other MCP client</B>: paste the same URL — no OAuth flow
            required.
          </li>
        </Ul>
        <H2>Endpoint 2: header auth (CLI agents)</H2>
        <P>
          Tools that can send custom headers use the bare endpoint with a
          bearer token:
        </P>
        <CodeBlock>{`# Claude Code
claude mcp add --transport http career-copilot ${origin}/api/mcp \\
  --header "Authorization: Bearer ${token}"

# Gemini CLI
gemini mcp add --transport http career-copilot ${origin}/api/mcp \\
  --header "Authorization: Bearer ${token}"`}</CodeBlock>
        <H2>JSON configuration</H2>
        <P>
          Many tools configure MCP servers in a JSON file instead of a
          settings screen. <B>No LLM API key is needed anywhere</B> — the AI
          tool brings its own model; the only credential is your{" "}
          <Code>MCP_TOKEN</Code>, passed as a bearer header (or baked into
          the URL if the tool&apos;s config has no headers field).
        </P>
        <P>
          <B>Claude Code</B> — <Code>.mcp.json</Code> in a project (or add
          via the CLI command above):
        </P>
        <CodeBlock>{`{
  "mcpServers": {
    "career-copilot": {
      "type": "http",
      "url": "${origin}/api/mcp",
      "headers": { "Authorization": "Bearer ${token}" }
    }
  }
}`}</CodeBlock>
        <P>
          <B>Gemini CLI</B> — <Code>~/.gemini/settings.json</Code>:
        </P>
        <CodeBlock>{`{
  "mcpServers": {
    "career-copilot": {
      "httpUrl": "${origin}/api/mcp",
      "headers": { "Authorization": "Bearer ${token}" }
    }
  }
}`}</CodeBlock>
        <P>
          <B>Cursor / VS Code and similar</B> — if the config supports remote
          servers but not headers, point <Code>url</Code> at the token-in-path
          endpoint:
        </P>
        <CodeBlock>{`{
  "mcpServers": {
    "career-copilot": { "url": "${connectorUrl}" }
  }
}`}</CodeBlock>
        <P>
          <B>Stdio-only tools</B> (configs that only accept a{" "}
          <Code>command</Code>, like older Claude Desktop JSON): bridge with{" "}
          <Code>mcp-remote</Code>:
        </P>
        <CodeBlock>{`{
  "mcpServers": {
    "career-copilot": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "${connectorUrl}"]
    }
  }
}`}</CodeBlock>
        <H2>First contact</H2>
        <P>
          The server introduces itself to every connecting AI with
          instructions: load your career context first, offer the guided
          interview if you&apos;re new, and keep your dashboard current. So
          after connecting, just start talking — no setup prompt needed.
        </P>
      </>
    ),
  },
  {
    slug: "dashboard",
    group: "Using the app",
    title: "Dashboard & action items",
    description:
      "A month-grouped timeline of notes and to-dos — your coach's whiteboard.",
    Body: () => (
      <>
        <P>
          The <A href="/">dashboard</A> is where career growth gets tracked:
          action items like reading an article, applying to an opportunity,
          or learning a skill, organized as a timeline with <B>a header per
          month</B>. Your AI composes and schedules items via MCP; you check
          things off as you do them.
        </P>
        <H2>Anatomy of a card</H2>
        <Ul>
          <li>
            <B>Title</B> — bold, on its own line. Click it (when expanded) to
            rename.
          </li>
          <li>
            <B>Body</B> — a basic text editor underneath: explanations,
            hyperlinks (rendered clickable), and checkbox to-dos. Start a
            line with <Code>[]&nbsp;</Code> to make it a checkbox; click a
            checkbox to mark it done (it stays, struck through).
          </li>
          <li>
            <B>Collapsed by default</B> — cards show the title, a to-do
            count, and a faded two-line preview. Click the triangle (or the
            card) to expand to full height; click into the text to edit.
          </li>
          <li>
            <B>Month</B> — each card belongs to a month (the expanded footer
            has a picker); undated cards group under &quot;Someday&quot;.
          </li>
        </Ul>
        <H2>Working with your AI</H2>
        <ul className="mb-3 list-none pl-0">
          <Prompt>What should I be working on? Check my action items.</Prompt>
          <Prompt>I finished the ML course — check it off and tell me what&apos;s next.</Prompt>
          <Prompt>Plan my fall: spread my action items across Sep–Dec sensibly.</Prompt>
        </ul>
      </>
    ),
  },
  {
    slug: "applications",
    group: "Using the app",
    title: "Applications",
    description:
      "Pipeline, deadlines, tracked jobs, and the application-window timeline.",
    Body: () => (
      <>
        <P>
          <A href="/applications">Applications</A> gathers everything
          job-related: pipeline stats across the six statuses (saved →
          applied → interviewing → offer / rejected / withdrawn), upcoming
          deadlines, your tracked jobs, and the application timeline.
        </P>
        <H2>Tracking a job</H2>
        <P>
          Add a job with <B>+ Add job</B> (header button). Paste the{" "}
          <B>full job description text</B>, not just the link — Handshake and
          most boards sit behind logins, so your AI can only work with text
          that travels with the posting. Each job page holds the JD, notes,
          status, deadline, and every document generated for it.
        </P>
        <H2>The application timeline</H2>
        <P>
          The timeline shows <B>when each company&apos;s application window
          opens</B>, grouped by month with an &quot;Open now&quot; badge —
          because applying in week one matters; roles fill as they post. Ask
          your AI to research target companies and import their hiring
          cycles; one click (<B>Track as job</B>) promotes a window into a
          tracked job when you&apos;re ready to apply.
        </P>
        <ul className="mb-3 list-none pl-0">
          <Prompt>Research when big pharma ML internships open and build my application timeline.</Prompt>
          <Prompt>Mark the &lt;company&gt; job as applied.</Prompt>
          <Prompt>What&apos;s open right now that I haven&apos;t applied to?</Prompt>
        </ul>
      </>
    ),
  },
  {
    slug: "documents",
    group: "Using the app",
    title: "Documents",
    description:
      "Tailored resumes, cover letters, interview prep, and briefings — written by your AI.",
    Body: () => (
      <>
        <P>
          Documents are Markdown files your AI saves into the app: tailored{" "}
          <B>resumes</B>, <B>cover letters</B>, <B>interview prep</B>,{" "}
          <B>match analyses</B>, and <B>industry briefings</B>. Job documents
          attach to their job; general ones (a master resume, a weekly
          briefing) stand alone.
        </P>
        <Ul>
          <li>
            <B>Versioning</B> — re-generating the same document creates a new
            version automatically; old versions stay.
          </li>
          <li>
            <B>Print / Save as PDF</B> — the document page has
            print-optimized styling; the button produces a clean one-page
            PDF via your browser&apos;s print dialog.
          </li>
          <li>
            <B>Truthfulness</B> — AIs are instructed to tailor by selecting
            and rephrasing real profile entries, never inventing facts.
          </li>
        </Ul>
        <ul className="mb-3 list-none pl-0">
          <Prompt>Analyze my fit for the &lt;company&gt; job, then tailor a resume and cover letter.</Prompt>
          <Prompt>Research this week&apos;s news for my target industry and save me a briefing at my level.</Prompt>
        </ul>
      </>
    ),
  },
  {
    slug: "profile",
    group: "Using the app",
    title: "Profile",
    description: "The master profile every tailored document is cut from.",
    Body: () => (
      <>
        <P>
          Your <A href="/profile">profile</A> is the source of truth: contact
          info, a professional summary, and entries for education,
          experience, projects, leadership, skills, and certifications. Be
          generous — include everything, because tailoring means cutting,
          not inventing.
        </P>
        <Ul>
          <li>
            Entries collapse to a title row with a faded description preview;
            expand to edit.
          </li>
          <li>
            Skills are chip-based — create categories and add skills inline.
          </li>
          <li>
            The fastest way to populate it: paste your resume into your AI
            and say{" "}
            <Code>Import my resume into my Career Copilot profile</Code>.
          </li>
        </Ul>
      </>
    ),
  },
  {
    slug: "how-the-ai-works",
    group: "AI & MCP",
    title: "How the AI works",
    description:
      "The hidden career narrative, the first-time interview, and what your AI knows.",
    Body: () => (
      <>
        <P>
          The app keeps a <B>career narrative</B> — where you started, where
          you are, where you&apos;re headed, interests, constraints, and gaps
          — as behind-the-scenes coach memory. It has no UI; connected AIs
          are its only readers and writers. That&apos;s what lets any AI
          tool pick up exactly where another left off.
        </P>
        <H2>The first-time interview</H2>
        <P>
          The first AI to connect finds the narrative empty and offers a
          short guided interview — six questions, one at a time. Your answers
          become the narrative; the AI then seeds your dashboard with starter
          action items. From then on, every meaningful conversation refines
          the picture, so your career memory <B>progresses over time</B>.
        </P>
        <H2>Transparency</H2>
        <P>
          It&apos;s your data, just stored out of the UI&apos;s way. Ask any
          connected AI <Code>What do you know about me?</Code> and it will
          share the narrative openly; tell it to correct anything that&apos;s
          drifted.
        </P>
        <H2>Background work</H2>
        <P>
          The app can&apos;t summon your AI — MCP connections are always
          initiated by the AI client. For recurring work (like a weekly
          briefing), use your AI tool&apos;s scheduled tasks to run a prompt
          on a cadence; the results land here automatically. And whenever any
          AI connects, the server flags pending work — an empty narrative, a
          stale briefing, open action items — so visits start productively.
        </P>
      </>
    ),
  },
  {
    slug: "mcp-reference",
    group: "AI & MCP",
    title: "MCP reference",
    description: "Endpoints, the full tool list, and a prompt library.",
    Body: ({ origin, connectorUrl }) => (
      <>
        <H2>Endpoints</H2>
        <CodeBlock>{`Connector URL (URL is the secret):
${connectorUrl}

Header auth:
POST ${origin}/api/mcp
Authorization: Bearer <MCP_TOKEN>`}</CodeBlock>
        <H2>Tools</H2>
        <Ul>
          <li>
            <B>Coach memory</B>: <Code>get_career_narrative</Code>,{" "}
            <Code>update_career_narrative</Code>
          </li>
          <li>
            <B>Dashboard action items</B>: <Code>list_notes</Code>,{" "}
            <Code>upsert_note</Code>, <Code>delete_note</Code>
          </li>
          <li>
            <B>Profile</B>: <Code>get_profile</Code>,{" "}
            <Code>update_profile</Code>, <Code>upsert_profile_entry</Code>,{" "}
            <Code>delete_profile_entry</Code>
          </li>
          <li>
            <B>Jobs</B>: <Code>list_jobs</Code>, <Code>get_job</Code>,{" "}
            <Code>add_job</Code>, <Code>update_job</Code>
          </li>
          <li>
            <B>Application timeline</B>: <Code>list_timeline</Code>,{" "}
            <Code>upsert_timeline_event</Code>,{" "}
            <Code>delete_timeline_event</Code>
          </li>
          <li>
            <B>Documents</B>: <Code>save_document</Code>,{" "}
            <Code>list_documents</Code>, <Code>get_document</Code>
          </li>
        </Ul>
        <H2>Prompt library</H2>
        <ul className="mb-3 list-none pl-0">
          <Prompt>Import my resume into my Career Copilot profile.</Prompt>
          <Prompt>Interview me and fill in my career narrative.</Prompt>
          <Prompt>What should I be working on? Check my narrative and action items.</Prompt>
          <Prompt>What jobs in my tracker still need documents?</Prompt>
          <Prompt>Analyze my fit for the &lt;company&gt; job, then tailor a resume and cover letter.</Prompt>
          <Prompt>Research when &lt;industry&gt; internships open and build my application timeline.</Prompt>
          <Prompt>Research this week&apos;s news for my target industry and save me a briefing at my level.</Prompt>
        </ul>
      </>
    ),
  },
];

export const DOC_GROUPS = ["Get started", "Using the app", "AI & MCP"];
