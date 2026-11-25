# Personal context layer

Give people a place to maintain their goals, preferences, projects, and current circumstances, then let their coding agents retrieve the pieces that matter for the task at hand. The first workflow is a coding decision that gets better because the agent knows what the user is working toward and what constraints they face this week.

The Markdown inspiration maps closely to OpenClaw’s `USER.md` and memory files. Its `SOUL.md` describes the agent’s persona. This product would provide an editable source of user context that can follow the user across agents and repositories. [OpenClaw workspace documentation](https://docs.openclaw.ai/concepts/agent-workspace)

## First release

1. Put a **Personal Context** page at the center of the app. Let the user add, edit, archive, and preview what they share. Start with goals, projects, preferences, and current circumstances. A short “Right now” view shows active goals and time-sensitive constraints.
2. Give each entry a type, title, Markdown body, last-updated date, and sharing setting. Allow optional review or expiry dates and simple relationships such as a project supporting a goal or a circumstance affecting a project. Use types and relationships to make retrieval predictable.
3. Give a connected coding agent a read-only MCP tool that accepts a task or project and returns a short brief with relevant, shared entries and their dates. Start with matching on project, linked goals, and keywords. Add a Markdown download generated from the same records for manual use.
4. Test with one repo and one coding agent. For example, link a goal to ship a demo to a project, then add a temporary constraint of two available evenings. Ask the agent to plan the next milestone. Verify that it uses those entries, skips private entries, and stops using the constraint after it expires. Test that revoking the connection blocks further retrieval.

## How the existing app changes

| Existing feature | Role after the pivot |
| --- | --- |
| Career narrative | Offer a previewable import of relevant sections into editable entries. For example, import goals and current circumstances as private drafts and let the user choose what to share. |
| Notes and actions | Reuse the editor and surface relevant notes as historical context. Import selectively so old to-dos do not become current priorities. |
| Applications, résumé tools, and career timelines | Keep accessible under a Career section and preserve existing data and connector compatibility. |
| MCP server | Reuse the transport. Add a separately authenticated personal context endpoint with per-connection revocation, scoped reads, and server-side filtering. The existing shared career token stays limited to career tools. Keep vault credentials out of the context endpoint and export. |

Personal entries start private. Connected agents receive only entries the user has shared within that connection’s scope. Return stored text as data with source and freshness information. Once the read workflow proves useful, allow agents to propose changes that the user can review before saving.

## Implementation order

1. Build the context model and editor with a sample project and optional career narrative import.
2. Add scoped MCP reads and Markdown export, then verify the same task in a connected coding agent.
3. Make Personal Context the default home and move the existing workflows under Career after checking existing routes and connector calls.

This plan assumes a personal deployment first. If the first release is for multiple people, add per-user ownership, isolation tests, and account-bound connector credentials before onboarding anyone else.

## Import and connect

The single-user pilot uses seven editable Markdown sections. Export or summarize your context from Muse into these headings, then paste the relevant text into **Personal context** in the app.

- About me
- Goals and priorities
- Current projects
- Résumé and experience
- Working preferences
- People in my life
- Daily logistics

Save each section as private while you review it. Select **Share with connected agents** and save again to publish that section to your personal context connections. You can uncheck it and save whenever its visibility needs to change. Up to 20,000 characters are supported per section.

For an existing database, apply the `personal_context` migration. Set `PERSONAL_CONTEXT_OWNER_ID` to your user UUID from Supabase Authentication. Set `PERSONAL_CONTEXT_MCP_TOKENS` to a comma-separated list of dedicated random secrets. Generate a distinct secret per client with `openssl rand -hex 32`. Removing a token from the environment and restarting or redeploying revokes that client’s access.

Connect clients that support authenticated Streamable HTTP to `https://<your-app>/api/mcp/personal` with the header `Authorization: Bearer <client-token>`. Ask a fresh agent session to call `get_personal_context` with `{"section":"goals"}` and check the result against what you shared. Each token can read the same shared sections.

## Import directly from Muse

Your existing Career Copilot connection can discover both personal context tools once the `personal_context_import` migration and `PERSONAL_CONTEXT_OWNER_ID` are configured. Keep the existing endpoint and credential, and refresh the tool list if Muse caches it. To grant import access alone, use the dedicated `/api/mcp/personal` endpoint with `PERSONAL_CONTEXT_MCP_IMPORT_TOKEN` in the bearer header.

Once the connector lists the import tool, ask Muse:

> Export the personal context you can access to my Personal Context MCP. Use the import tool and organize the material into the supported sections. Keep relevant details, omit credentials, and tell me which sections were imported or skipped.

The tool saves each new section privately and reports any existing sections it skipped. Review the results in **Personal context** and choose what other agents can read.
