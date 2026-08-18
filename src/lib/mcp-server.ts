import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { DocumentRow, Job, Profile, ProfileEntry } from "@/lib/types";

// Minimal stateless MCP server (streamable HTTP transport, JSON responses).
// The app has no AI of its own — connected AI clients (Claude, ChatGPT,
// Claude Code, Codex...) are the intelligence layer: they read the career
// narrative + profile + jobs, then write guidance, action items, tailored
// documents, and industry briefings back into the app.
//
// Two auth styles, same handler:
//   - Header:  Authorization: Bearer $MCP_TOKEN   (CLI tools)
//   - Path:    /api/mcp/$MCP_TOKEN                (claude.ai / ChatGPT
//     custom connectors, which support only authless or OAuth servers and
//     cannot send custom headers)

const PROTOCOL_VERSION = "2025-03-26";

const JOB_STATUSES = ["saved", "applied", "interviewing", "offer", "rejected", "withdrawn"];
const SECTIONS = ["education", "experience", "projects", "leadership", "skills", "certifications", "other"];
const DOC_TYPES = ["resume", "cover_letter", "interview_prep", "match_analysis", "briefing", "other"];

const SERVER_INSTRUCTIONS = `You are the intelligence layer for this career-growth app; the app itself has no AI. The app keeps a hidden "career narrative" — behind-the-scenes coach memory about the candidate (where they started, where they are now, where they're headed, interests, constraints, gaps, coach notes). It is NOT visible anywhere in the app's UI: connected AI tools like you are its only readers and writers, and it is how coaching context survives across sessions and across different AI tools.

Session protocol:
1. LOAD CONTEXT FIRST: call get_career_narrative before answering any career question. It returns the coach memory plus pending work (open action items, briefing staleness).
2. FIRST TIME (it returns first_time: true): the candidate has no coach memory yet. Proactively suggest a short guided interview — the response includes the question guide. Ask ONE question at a time, conversationally; after the interview, save the picture with update_career_narrative and seed the dashboard with 2–4 sections via upsert_note, each with a few "[ ] task" lines. Tell the candidate this builds a private career memory that makes every future conversation (in any AI tool) smarter.
3. RETURNING: the memory should progress over time. Whenever a conversation reveals something new — a skill gained, a goal sharpened, a worry, a win — merge it in via update_career_narrative. Refine the existing text (you loaded it in step 1); never wholesale overwrite. Leave coach_notes for the next session.
4. TRANSPARENCY: if the candidate asks what you know about them, share the narrative content openly — it is their data, just stored out of the UI's way.
5. THE DASHBOARD IS A LIST OF SECTIONS (list_notes / upsert_note / delete_note): each section has a bold title and a free-text body where lines written as "[ ] task" render as checkable to-dos and "[x] task" as done. Compose it like a coach's whiteboard — one section per theme (e.g. "Start an ML fundamentals course"), body mixing short explanation, links, and to-do lines. Keep it curated: a handful of sections, ≤6 unchecked "[ ]" lines total, mark lines "[x]" as the candidate reports progress, delete stale sections. Long bodies are fine — the UI collapses them to a fading preview.
6. Keep briefings current (save_document doc_type "briefing", vocabulary matched to the level recorded in current_state), and resumes truthful (tailoring selects and rephrases real profile entries, never invents).`;

const INTERVIEW_GUIDE = {
  style:
    "One question at a time, conversational, ~5 minutes total. Follow up naturally; skip questions they've already answered. Afterwards: save with update_career_narrative, then seed the dashboard with 2–4 sections via upsert_note, each with a few '[ ] task' lines.",
  questions: [
    { field: "starting_point", ask: "What first got you interested in your field? Where did this all start?" },
    { field: "current_state", ask: "Where are you right now — school year / role, and what skills or experience have you picked up so far?" },
    { field: "goals", ask: "If things go well, where do you want to be in 3–5 years? Any target roles, companies, or industries?" },
    { field: "interests", ask: "What topics or problems genuinely pull you in — the things you'd read about even if nobody assigned them?" },
    { field: "constraints_text", ask: "Any real-world constraints I should plan around — time, location, finances, grades, visa?" },
    { field: "gap_analysis", ask: "What feels like the biggest obstacle between where you are and where you want to go?" },
  ],
};

interface ToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

const TOOLS: ToolDef[] = [
  {
    name: "get_career_narrative",
    description:
      "ALWAYS CALL THIS FIRST, before answering any career question. Loads the behind-the-scenes coach memory (not visible in the app UI): where the candidate began, where they are now, where they're headed, interests, constraints, gap analysis, and coach notes from previous AI sessions — possibly from other AI tools. Also reports pending work (open action items, briefing staleness). If it returns first_time: true, suggest the included guided interview to build the memory.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "update_career_narrative",
    description:
      "Persist coach memory. Only provided fields change. MERGE, don't overwrite: you loaded the current text via get_career_narrative — refine it with what this conversation revealed, so the picture progresses over time. Write in clear prose the candidate would recognize as their own story; use coach_notes for observations future AI sessions should know (level, momentum, recurring worries). Keep current_state honest about industry-comprehension level — briefing vocabulary is calibrated from it.",
    inputSchema: {
      type: "object",
      properties: {
        starting_point: { type: "string", description: "Where they began: background, first exposures to the field" },
        current_state: { type: "string", description: "Where they are now: skills, experience, industry-knowledge level" },
        goals: { type: "string", description: "Where they're headed: target roles, industry, timeframe" },
        interests: { type: "string", description: "What pulls them: topics, problems, environments" },
        constraints_text: { type: "string", description: "Realities: time, location, finances, visa, GPA" },
        gap_analysis: { type: "string", description: "What stands between current_state and goals" },
        coach_notes: { type: "string", description: "Cross-session observations for the next AI coach" },
      },
    },
  },
  {
    name: "list_notes",
    description:
      "The dashboard 'Notes & actions' sections: each has a bold title and a free-text body where lines '[ ] task' are open to-dos and '[x] task' are done. Read before editing so you update the right section instead of duplicating it.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "upsert_note",
    description:
      "Add a dashboard section, or update one when note_id is given. One section per theme — title short and specific ('Start an ML fundamentals course'), body mixing brief explanation, links (URLs render clickable), and to-do lines written as '[ ] task'. To check a to-do off after the candidate reports progress, resend the body with that line as '[x] task'. Only provided fields change.",
    inputSchema: {
      type: "object",
      properties: {
        note_id: { type: "string", description: "Omit to create a new section" },
        title: { type: "string", description: "Bold section title" },
        body: {
          type: "string",
          description:
            "Multiline free text; '[ ] task' lines render as checkboxes, '[x] task' as checked",
        },
        after_note_id: {
          type: "string",
          description: "Creation only: place the new section right after this one; omit to append at the end",
        },
      },
    },
  },
  {
    name: "delete_note",
    description:
      "Delete a dashboard section by id. Use to prune stale or completed clutter and keep the dashboard readable in about one screen.",
    inputSchema: {
      type: "object",
      properties: { note_id: { type: "string" } },
      required: ["note_id"],
    },
  },
  {
    name: "get_profile",
    description:
      "The candidate's master profile: contact info, summary, and every resume entry grouped by section (education, experience, projects, leadership, skills, certifications). This is the source of truth to tailor resumes FROM — tailoring means selecting and rephrasing these real entries, never inventing new facts.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "update_profile",
    description:
      "Update the profile header (contact info / summary). Only the provided fields change.",
    inputSchema: {
      type: "object",
      properties: {
        full_name: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        location: { type: "string" },
        linkedin_url: { type: "string" },
        github_url: { type: "string" },
        website_url: { type: "string" },
        summary: { type: "string" },
      },
    },
  },
  {
    name: "upsert_profile_entry",
    description:
      "Add a resume entry to the master profile, or update one when entry_id is given. Useful for importing an existing resume the candidate pasted in chat.",
    inputSchema: {
      type: "object",
      properties: {
        entry_id: { type: "string", description: "Omit to create a new entry" },
        section: { type: "string", enum: SECTIONS },
        title: { type: "string", description: "Degree, role, project name, or skill-group label" },
        organization: { type: "string" },
        location: { type: "string" },
        date_range: { type: "string", description: 'e.g. "Aug 2024 – May 2028"' },
        description: { type: "string", description: "Bullets, one per line (comma list for skills)" },
        sort_order: { type: "number" },
      },
      required: ["section"],
    },
  },
  {
    name: "delete_profile_entry",
    description: "Delete a profile entry by id.",
    inputSchema: {
      type: "object",
      properties: { entry_id: { type: "string" } },
      required: ["entry_id"],
    },
  },
  {
    name: "list_jobs",
    description:
      "All jobs in the tracker with status, deadline, and whether a job description is on file. Statuses: saved → applied → interviewing → offer / rejected / withdrawn.",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: JOB_STATUSES, description: "Optional filter" },
      },
    },
  },
  {
    name: "get_job",
    description:
      "Full detail for one job: the pasted job description text, notes, dates, and the list of documents already generated for it.",
    inputSchema: {
      type: "object",
      properties: { job_id: { type: "string" } },
      required: ["job_id"],
    },
  },
  {
    name: "add_job",
    description: "Add a job posting to the tracker (status starts at 'saved').",
    inputSchema: {
      type: "object",
      properties: {
        company: { type: "string" },
        title: { type: "string" },
        url: { type: "string" },
        source: { type: "string", description: "Handshake, LinkedIn, company site..." },
        location: { type: "string" },
        jd_text: { type: "string", description: "Full job description text" },
        deadline: { type: "string", description: "YYYY-MM-DD" },
        notes: { type: "string" },
      },
      required: ["company", "title"],
    },
  },
  {
    name: "update_job",
    description:
      "Update a job: move its status, set/replace the job description text, notes, or deadline. Setting status to 'applied' stamps the applied date.",
    inputSchema: {
      type: "object",
      properties: {
        job_id: { type: "string" },
        status: { type: "string", enum: JOB_STATUSES },
        jd_text: { type: "string" },
        notes: { type: "string" },
        deadline: { type: "string", description: "YYYY-MM-DD" },
      },
      required: ["job_id"],
    },
  },
  {
    name: "list_timeline",
    description:
      "The application timeline: when companies' internship/job application windows open and close, ordered chronologically. Use it to tell the candidate what is open now, what opens next, and what they should prepare for.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "upsert_timeline_event",
    description:
      "Add an application-window event to the timeline, or update one when event_id is given. This is how researched hiring timelines get into the app: after researching when a company's internship postings go live, save one event per company/program with the window dates and apply-early notes. Personal milestones (e.g. 'build phase: ship a project, update resume') use company 'Prep'.",
    inputSchema: {
      type: "object",
      properties: {
        event_id: { type: "string", description: "Omit to create a new event" },
        company: { type: "string", description: '"Genentech", "NIH", or "Prep" for personal milestones' },
        program: { type: "string", description: 'Program/role name, e.g. "Summer Internship Program (SIP)"' },
        window_label: { type: "string", description: 'Human-readable window, e.g. "Nov 2026 – Mar 2027 (rolling)"' },
        starts_on: { type: "string", description: "YYYY-MM-DD — approximate window open (used for ordering)" },
        ends_on: { type: "string", description: "YYYY-MM-DD — approximate close / deadline" },
        url: { type: "string", description: "Program or careers page URL" },
        notes: { type: "string", description: "Eligibility, acceptance stats, apply-week-one tips, sources" },
      },
      required: ["company"],
    },
  },
  {
    name: "delete_timeline_event",
    description: "Delete a timeline event by id.",
    inputSchema: {
      type: "object",
      properties: { event_id: { type: "string" } },
      required: ["event_id"],
    },
  },
  {
    name: "save_document",
    description:
      "Save a generated document (Markdown) into the app: a tailored resume, cover letter, interview prep, match analysis, or industry briefing. Attach it to a job with job_id (recommended for job docs); omit job_id for general documents like a master resume or a briefing. Briefings should be curated (≈5 items, each with why-it-matters-to-YOU) and written at the comprehension level recorded in the career narrative. Re-saving the same type+title creates a new version automatically.",
    inputSchema: {
      type: "object",
      properties: {
        job_id: { type: "string" },
        doc_type: { type: "string", enum: DOC_TYPES },
        title: { type: "string", description: 'e.g. "Resume — Stripe SWE Intern" or "Industry briefing — week of Aug 17"' },
        content_md: { type: "string", description: "The full document as Markdown" },
      },
      required: ["doc_type", "title", "content_md"],
    },
  },
  {
    name: "list_documents",
    description: "List generated documents (optionally for one job).",
    inputSchema: {
      type: "object",
      properties: { job_id: { type: "string" } },
    },
  },
  {
    name: "get_document",
    description: "Fetch one document's full Markdown content by id.",
    inputSchema: {
      type: "object",
      properties: { document_id: { type: "string" } },
      required: ["document_id"],
    },
  },
];

/* eslint-disable @typescript-eslint/no-explicit-any */

type Supabase = ReturnType<typeof createServiceClient>;

async function log(
  supabase: Supabase,
  action: string,
  detail: string,
  job_id: string | null = null
) {
  await supabase.from("activity").insert({ actor: "claude", action, detail, job_id });
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

async function callTool(name: string, args: any): Promise<unknown> {
  const supabase = createServiceClient();

  switch (name) {
    case "get_career_narrative": {
      const [{ data: narrativeRow }, { data: noteRows }, { data: latestBriefing }] =
        await Promise.all([
          supabase.from("career_narrative").select("*").maybeSingle(),
          supabase.from("coach_notes").select("body"),
          supabase
            .from("documents")
            .select("created_at, title")
            .eq("doc_type", "briefing")
            .order("created_at", { ascending: false })
            .limit(1),
        ]);
      const n = narrativeRow as Record<string, string> | null;
      const briefing = latestBriefing?.[0];
      const briefingAgeDays = briefing
        ? Math.floor((Date.now() - new Date(briefing.created_at).getTime()) / 86_400_000)
        : null;
      const empty =
        !n || !["starting_point", "current_state", "goals"].some((f) => n[f]?.trim());
      return {
        first_time: empty,
        narrative: n
          ? {
              starting_point: n.starting_point,
              current_state: n.current_state,
              goals: n.goals,
              interests: n.interests,
              constraints: n.constraints_text,
              gap_analysis: n.gap_analysis,
              coach_notes: n.coach_notes,
              updated_at: n.updated_at,
            }
          : null,
        pending_work: {
          open_tasks: (noteRows ?? []).reduce(
            (sum: number, n: any) => sum + ((n.body.match(/^\[ \]/gm) ?? []).length),
            0
          ),
          latest_briefing: briefing
            ? { title: briefing.title, age_days: briefingAgeDays, stale: (briefingAgeDays ?? 0) > 7 }
            : { note: "No industry briefing yet — consider researching and saving one (doc_type 'briefing')." },
        },
        ...(empty
          ? {
              next_step:
                "No coach memory exists yet — this looks like the candidate's first session. Suggest a short guided interview to build their private career memory (it makes every future conversation, in any AI tool, smarter). Then save via update_career_narrative and seed the dashboard with 2–4 sections via upsert_note, each with a few '[ ] task' lines.",
              interview_guide: INTERVIEW_GUIDE,
            }
          : {
              next_step:
                "Use this memory as context. If this conversation reveals anything new about the candidate, merge it back via update_career_narrative before the session ends.",
            }),
      };
    }

    case "update_career_narrative": {
      const fields = [
        "starting_point", "current_state", "goals", "interests",
        "constraints_text", "gap_analysis", "coach_notes",
      ] as const;
      const patch: Record<string, string> = {};
      for (const f of fields) if (typeof args?.[f] === "string") patch[f] = args[f].trim();
      if (!Object.keys(patch).length) throw new Error("No fields to update.");

      const { data: existing } = await supabase
        .from("career_narrative")
        .select("id")
        .maybeSingle();
      const { error } = existing
        ? await supabase
            .from("career_narrative")
            .update({ ...patch, updated_at: new Date().toISOString() })
            .eq("id", existing.id)
        : await supabase.from("career_narrative").insert(patch);
      if (error) throw new Error(error.message);
      await log(supabase, "update_career_narrative", `Updated career narrative (${Object.keys(patch).join(", ")})`);
      return { ok: true, updated: Object.keys(patch) };
    }

    case "list_notes": {
      const { data } = await supabase
        .from("coach_notes")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      return (data ?? []).map((n: any) => ({
        note_id: n.id,
        title: n.title,
        body: n.body,
        open_tasks: (n.body.match(/^\[ \]/gm) ?? []).length,
      }));
    }

    case "upsert_note": {
      const values: Record<string, unknown> = {};
      if (typeof args?.title === "string") values.title = args.title.trim();
      if (typeof args?.body === "string") values.body = args.body.trim();

      if (args?.note_id) {
        if (!Object.keys(values).length) throw new Error("No fields to update.");
        const { error } = await supabase
          .from("coach_notes")
          .update({ ...values, updated_at: new Date().toISOString() })
          .eq("id", str(args.note_id));
        if (error) throw new Error(error.message);
        await log(
          supabase,
          "upsert_note",
          `Updated section${values.title ? `: ${values.title}` : ""}`
        );
        return { ok: true, note_id: args.note_id };
      }

      if (!values.title && !values.body) {
        throw new Error("title or body is required to create a section.");
      }
      // Position: after the given note (midpoint to its successor), else append.
      const { data: ordered } = await supabase
        .from("coach_notes")
        .select("id, sort_order")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      const all = ordered ?? [];
      let sort_order = (all[all.length - 1]?.sort_order ?? 0) + 1;
      const afterId = str(args?.after_note_id);
      if (afterId) {
        const i = all.findIndex((n: any) => n.id === afterId);
        if (i === -1) throw new Error("after_note_id does not match a section — check list_notes.");
        sort_order =
          i + 1 < all.length
            ? (all[i].sort_order + all[i + 1].sort_order) / 2
            : all[i].sort_order + 1;
      }
      const { data, error } = await supabase
        .from("coach_notes")
        .insert({ title: values.title ?? "", body: values.body ?? "", sort_order })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      await log(supabase, "upsert_note", `New section: ${values.title || "(untitled)"}`);
      return { ok: true, note_id: data.id };
    }

    case "delete_note": {
      const { error } = await supabase
        .from("coach_notes")
        .delete()
        .eq("id", str(args?.note_id));
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    case "get_profile": {
      const [{ data: profileRow }, { data: entryRows }, { data: narrativeRow }] =
        await Promise.all([
          supabase.from("profile").select("*").maybeSingle(),
          supabase
            .from("profile_entries")
            .select("*")
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: true }),
          supabase
            .from("career_narrative")
            .select("starting_point, current_state, goals")
            .maybeSingle(),
        ]);
      const narrativeEmpty =
        !narrativeRow ||
        !Object.values(narrativeRow).some((v) => (v as string)?.trim());
      const p = profileRow as Profile | null;
      const entries = (entryRows ?? []) as ProfileEntry[];
      const bySection: Record<string, unknown[]> = {};
      for (const e of entries) {
        (bySection[e.section] ??= []).push({
          entry_id: e.id,
          title: e.title,
          organization: e.organization,
          location: e.location,
          date_range: e.date_range,
          description: e.description,
        });
      }
      return {
        header: p
          ? {
              full_name: p.full_name,
              email: p.email,
              phone: p.phone,
              location: p.location,
              linkedin_url: p.linkedin_url,
              github_url: p.github_url,
              website_url: p.website_url,
              summary: p.summary,
            }
          : { note: "Profile header is empty — the candidate should fill in /profile (or use update_profile)." },
        sections: bySection,
        ...(narrativeEmpty && {
          coach_context_note:
            "The behind-the-scenes coach memory is empty — call get_career_narrative for the first-time interview flow before giving career guidance.",
        }),
      };
    }

    case "update_profile": {
      const fields = [
        "full_name", "email", "phone", "location",
        "linkedin_url", "github_url", "website_url", "summary",
      ] as const;
      const patch: Record<string, string> = {};
      for (const f of fields) if (typeof args?.[f] === "string") patch[f] = args[f].trim();
      if (!Object.keys(patch).length) throw new Error("No fields to update.");

      const { data: existing } = await supabase.from("profile").select("id").maybeSingle();
      const { error } = existing
        ? await supabase
            .from("profile")
            .update({ ...patch, updated_at: new Date().toISOString() })
            .eq("id", existing.id)
        : await supabase.from("profile").insert(patch);
      if (error) throw new Error(error.message);
      await log(supabase, "update_profile", "Updated profile header");
      return { ok: true, updated: Object.keys(patch) };
    }

    case "upsert_profile_entry": {
      if (!SECTIONS.includes(args?.section)) {
        throw new Error(`section must be one of: ${SECTIONS.join(", ")}`);
      }
      const values = {
        section: args.section,
        title: str(args?.title),
        organization: str(args?.organization),
        location: str(args?.location),
        date_range: str(args?.date_range),
        description: str(args?.description),
        sort_order: Number(args?.sort_order) || 0,
      };
      if (args?.entry_id) {
        const { error } = await supabase
          .from("profile_entries")
          .update({ ...values, updated_at: new Date().toISOString() })
          .eq("id", args.entry_id);
        if (error) throw new Error(error.message);
        await log(supabase, "upsert_profile_entry", `Updated ${values.section} entry: ${values.title}`);
        return { ok: true, entry_id: args.entry_id };
      }
      const { data, error } = await supabase
        .from("profile_entries")
        .insert(values)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      await log(supabase, "upsert_profile_entry", `Added ${values.section} entry: ${values.title}`);
      return { ok: true, entry_id: data.id };
    }

    case "delete_profile_entry": {
      const { error } = await supabase
        .from("profile_entries")
        .delete()
        .eq("id", str(args?.entry_id));
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    case "list_jobs": {
      let q = supabase.from("jobs").select("*").order("created_at", { ascending: false });
      if (args?.status) q = q.eq("status", args.status);
      const { data } = await q;
      return ((data ?? []) as Job[]).map((j) => ({
        job_id: j.id,
        company: j.company,
        title: j.title,
        status: j.status,
        location: j.location,
        source: j.source,
        deadline: j.deadline,
        applied_at: j.applied_at,
        has_job_description: j.jd_text.length > 0,
        url: j.url,
      }));
    }

    case "get_job": {
      const [{ data: jobRow }, { data: docRows }] = await Promise.all([
        supabase.from("jobs").select("*").eq("id", str(args?.job_id)).maybeSingle(),
        supabase
          .from("documents")
          .select("id, doc_type, title, version, created_at")
          .eq("job_id", str(args?.job_id))
          .order("created_at", { ascending: false }),
      ]);
      if (!jobRow) throw new Error("Job not found — check the id via list_jobs.");
      const j = jobRow as Job;
      return {
        job_id: j.id,
        company: j.company,
        title: j.title,
        url: j.url,
        source: j.source,
        location: j.location,
        status: j.status,
        deadline: j.deadline,
        applied_at: j.applied_at,
        notes: j.notes,
        job_description: j.jd_text || "(none pasted yet — ask the candidate for the JD text, or fetch it if the posting URL is public)",
        documents: (docRows ?? []).map((d: any) => ({
          document_id: d.id,
          doc_type: d.doc_type,
          title: d.title,
          version: d.version,
          created_at: d.created_at,
        })),
      };
    }

    case "add_job": {
      const company = str(args?.company);
      const title = str(args?.title);
      if (!company || !title) throw new Error("company and title are required.");
      const { data, error } = await supabase
        .from("jobs")
        .insert({
          company,
          title,
          url: str(args?.url),
          source: str(args?.source),
          location: str(args?.location),
          jd_text: str(args?.jd_text),
          notes: str(args?.notes),
          deadline: str(args?.deadline) || null,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      await log(supabase, "add_job", `Added ${title} @ ${company}`, data.id);
      return { job_id: data.id, status: "saved" };
    }

    case "update_job": {
      const jobId = str(args?.job_id);
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (args?.status !== undefined) {
        if (!JOB_STATUSES.includes(args.status)) {
          throw new Error(`status must be one of: ${JOB_STATUSES.join(", ")}`);
        }
        patch.status = args.status;
        if (args.status === "applied") patch.applied_at = new Date().toISOString();
      }
      if (typeof args?.jd_text === "string") patch.jd_text = args.jd_text.trim();
      if (typeof args?.notes === "string") patch.notes = args.notes.trim();
      if (typeof args?.deadline === "string") patch.deadline = args.deadline.trim() || null;

      const { error } = await supabase.from("jobs").update(patch).eq("id", jobId);
      if (error) throw new Error(error.message);
      const changed = Object.keys(patch).filter((k) => k !== "updated_at");
      await log(
        supabase,
        "update_job",
        patch.status ? `Status → ${patch.status}` : `Updated ${changed.join(", ")}`,
        jobId
      );
      return { ok: true, updated: changed };
    }

    case "list_timeline": {
      const { data } = await supabase
        .from("timeline_events")
        .select("*")
        .order("starts_on", { ascending: true, nullsFirst: false });
      return (data ?? []).map((e: any) => ({
        event_id: e.id,
        company: e.company,
        program: e.program,
        window_label: e.window_label,
        starts_on: e.starts_on,
        ends_on: e.ends_on,
        url: e.url,
        notes: e.notes,
        tracked_job_id: e.job_id,
      }));
    }

    case "upsert_timeline_event": {
      const values: Record<string, unknown> = {
        program: str(args?.program),
        window_label: str(args?.window_label),
        starts_on: str(args?.starts_on) || null,
        ends_on: str(args?.ends_on) || null,
        url: str(args?.url),
        notes: str(args?.notes),
      };
      if (args?.event_id) {
        if (str(args?.company)) values.company = str(args.company);
        const { error } = await supabase
          .from("timeline_events")
          .update({ ...values, updated_at: new Date().toISOString() })
          .eq("id", str(args.event_id));
        if (error) throw new Error(error.message);
        await log(supabase, "upsert_timeline_event", `Timeline: updated ${str(args?.company) || "event"}`);
        return { ok: true, event_id: args.event_id };
      }
      const company = str(args?.company);
      if (!company) throw new Error("company is required.");
      const { data, error } = await supabase
        .from("timeline_events")
        .insert({ ...values, company })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      await log(supabase, "upsert_timeline_event", `Timeline: added ${company} — ${str(args?.program)}`);
      return { ok: true, event_id: data.id, view_url: "/applications" };
    }

    case "delete_timeline_event": {
      const { error } = await supabase
        .from("timeline_events")
        .delete()
        .eq("id", str(args?.event_id));
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    case "save_document": {
      if (!DOC_TYPES.includes(args?.doc_type)) {
        throw new Error(`doc_type must be one of: ${DOC_TYPES.join(", ")}`);
      }
      const title = str(args?.title);
      const content = typeof args?.content_md === "string" ? args.content_md : "";
      if (!title || !content) throw new Error("title and content_md are required.");
      const jobId = str(args?.job_id) || null;

      if (jobId) {
        const { data: jobRow } = await supabase
          .from("jobs")
          .select("id")
          .eq("id", jobId)
          .maybeSingle();
        if (!jobRow) throw new Error("job_id does not match a job — check list_jobs.");
      }

      // Auto-version: next version among same job + type + title.
      let versionQuery = supabase
        .from("documents")
        .select("version")
        .eq("doc_type", args.doc_type)
        .eq("title", title)
        .order("version", { ascending: false })
        .limit(1);
      versionQuery = jobId ? versionQuery.eq("job_id", jobId) : versionQuery.is("job_id", null);
      const { data: prev } = await versionQuery;
      const version = ((prev?.[0] as Pick<DocumentRow, "version"> | undefined)?.version ?? 0) + 1;

      const { data, error } = await supabase
        .from("documents")
        .insert({ job_id: jobId, doc_type: args.doc_type, title, content_md: content, version })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      await log(supabase, "save_document", `Saved ${args.doc_type}: ${title} (v${version})`, jobId);
      return {
        document_id: data.id,
        version,
        view_url: `/documents/${data.id}`,
        note: "The candidate can view and print it from the website.",
      };
    }

    case "list_documents": {
      let q = supabase
        .from("documents")
        .select("id, job_id, doc_type, title, version, created_at")
        .order("created_at", { ascending: false });
      if (args?.job_id) q = q.eq("job_id", str(args.job_id));
      const { data } = await q;
      return (data ?? []).map((d: any) => ({
        document_id: d.id,
        job_id: d.job_id,
        doc_type: d.doc_type,
        title: d.title,
        version: d.version,
        created_at: d.created_at,
      }));
    }

    case "get_document": {
      const { data } = await supabase
        .from("documents")
        .select("*")
        .eq("id", str(args?.document_id))
        .maybeSingle();
      if (!data) throw new Error("Document not found.");
      const d = data as DocumentRow;
      return {
        document_id: d.id,
        job_id: d.job_id,
        doc_type: d.doc_type,
        title: d.title,
        version: d.version,
        content_md: d.content_md,
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

function rpcResult(id: unknown, result: unknown) {
  return NextResponse.json({ jsonrpc: "2.0", id, result });
}

function rpcError(id: unknown, code: number, message: string, status = 200) {
  return NextResponse.json(
    { jsonrpc: "2.0", id: id ?? null, error: { code, message } },
    { status }
  );
}

export async function mcpPost(request: NextRequest, pathToken?: string) {
  const token = process.env.MCP_TOKEN;
  const auth = request.headers.get("authorization") ?? "";
  const authorized =
    !!token && (auth === `Bearer ${token}` || pathToken === token);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let msg: any;
  try {
    msg = await request.json();
  } catch {
    return rpcError(null, -32700, "Parse error", 400);
  }
  if (Array.isArray(msg)) {
    return rpcError(null, -32600, "Batch requests not supported", 400);
  }

  const { id, method, params } = msg ?? {};

  // Notifications get an empty 202.
  if (typeof method === "string" && method.startsWith("notifications/")) {
    return new NextResponse(null, { status: 202 });
  }

  switch (method) {
    case "initialize":
      return rpcResult(id, {
        protocolVersion:
          typeof params?.protocolVersion === "string" ? params.protocolVersion : PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: "career-copilot", version: "2.0.0" },
        instructions: SERVER_INSTRUCTIONS,
      });

    case "ping":
      return rpcResult(id, {});

    case "tools/list":
      return rpcResult(id, { tools: TOOLS });

    case "tools/call": {
      const name = params?.name as string;
      try {
        const result = await callTool(name, params?.arguments ?? {});
        return rpcResult(id, {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          isError: false,
        });
      } catch (e) {
        return rpcResult(id, {
          content: [{ type: "text", text: e instanceof Error ? e.message : "Tool failed" }],
          isError: true,
        });
      }
    }

    default:
      return rpcError(id, -32601, `Method not found: ${method}`);
  }
}

// Stateless server: no SSE stream to reconnect to.
export function mcpMethodNotAllowed() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
