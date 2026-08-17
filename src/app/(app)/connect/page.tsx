import { headers } from "next/headers";
import { Badge, Card, PageHeader, SectionTitle } from "@/lib/ui";

const STARTER_PROMPTS = [
  "Interview me and fill in my career narrative in Career Copilot.",
  "What should I be working on right now? Check my narrative and action items.",
  "Research this week's news for my target industry and save me a briefing at my level.",
  "Tailor a resume for the <company> job in Career Copilot.",
  "Research when <industry> internships open and build my application timeline.",
];

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="mt-2 overflow-x-auto rounded-lg border border-stone-200 bg-stone-50 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-stone-700">
      {children}
    </pre>
  );
}

export default async function ConnectPage() {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const origin = `${proto}://${host}`;
  const token = process.env.MCP_TOKEN ?? "<MCP_TOKEN>";
  const connectorUrl = `${origin}/api/mcp/${token}`;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        title="Connect your AI"
        description="Career Copilot has no AI inside it — your own AI tools are the intelligence. Connect any MCP-capable assistant and it can read your career narrative, profile, and jobs, then write guidance, documents, and briefings back."
      />

      <Card className="p-5">
        <SectionTitle>Claude (web, desktop &amp; mobile)</SectionTitle>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-stone-600">
          <li>
            On claude.ai (or the desktop app), open{" "}
            <span className="font-medium text-stone-800">
              Settings → Connectors → Add custom connector
            </span>
          </li>
          <li>Paste this URL (no other auth needed — the URL is the key):</li>
        </ol>
        <CodeBlock>{connectorUrl}</CodeBlock>
        <p className="mt-2 text-xs leading-relaxed text-stone-400">
          Once added on the web, the connector also works in Claude&apos;s iOS
          and Android apps.
        </p>
      </Card>

      <Card className="p-5">
        <SectionTitle>ChatGPT (Plus / Pro and up)</SectionTitle>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-stone-600">
          <li>
            On the web app, enable{" "}
            <span className="font-medium text-stone-800">
              Settings → Apps → Advanced settings → Developer mode
            </span>
          </li>
          <li>Add a custom MCP connector with the same URL:</li>
        </ol>
        <CodeBlock>{connectorUrl}</CodeBlock>
        <p className="mt-2 text-xs leading-relaxed text-stone-400">
          Note: write tools (saving documents, updating your narrative) may be
          limited on Plus/Pro plans; read tools work everywhere.
        </p>
      </Card>

      <Card className="p-5">
        <SectionTitle>CLI agents (Claude Code, Codex...)</SectionTitle>
        <p className="mt-3 text-sm leading-relaxed text-stone-600">
          CLI tools can send auth headers, so they use the header-based
          endpoint:
        </p>
        <CodeBlock>{`claude mcp add --transport http career-copilot ${origin}/api/mcp \\
  --header "Authorization: Bearer ${token}"`}</CodeBlock>
      </Card>

      <Card className="p-5">
        <SectionTitle>Things to say once connected</SectionTitle>
        <ul className="mt-3 space-y-2">
          {STARTER_PROMPTS.map((p) => (
            <li key={p} className="flex items-start gap-2 text-sm text-stone-600">
              <Badge className="mt-0.5">prompt</Badge>
              <code className="rounded-md bg-stone-100 px-1.5 py-0.5 font-mono text-xs leading-relaxed">
                {p}
              </code>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs leading-relaxed text-stone-400">
          Tip: for a weekly briefing without lifting a finger, use your AI
          tool&apos;s scheduled tasks (Claude Code routines, ChatGPT tasks) to
          run the briefing prompt every Monday — the schedule lives in the AI
          tool, and the result lands here.
        </p>
      </Card>

      <p className="text-xs leading-relaxed text-stone-400">
        The connector URL contains your secret token — treat it like a
        password and don&apos;t share screenshots of this page.
      </p>
    </div>
  );
}
