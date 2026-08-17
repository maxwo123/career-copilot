import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { DocumentRow, Job, Profile, ProfileEntry } from "@/lib/types";

// Minimal stateless MCP server (streamable HTTP transport, JSON responses).
// Lets an AI client (Claude Code) act as the app's intelligence layer: read
// the master profile and saved jobs, then write tailored resumes, cover
// letters, and prep docs back into the app.
//
// Connect with:  claude mcp add --transport http career-copilot <origin>/api/mcp \
//                  --header "Authorization: Bearer $MCP_TOKEN"

export const maxDuration = 60;

const PROTOCOL_VERSION = "2025-03-26";

const JOB_STATUSES = ["saved", "applied", "interviewing", "offer", "rejected", "withdrawn"];
const SECTIONS = ["education", "experience", "projects", "leadership", "skills", "certifications", "other"];
const DOC_TYPES = ["resume", "cover_letter", "interview_prep", "match_analysis", "other"];

interface ToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

const TOOLS: ToolDef[] = [
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
    name: "save_document",
    description:
      "Save a generated document (Markdown) into the app: a tailored resume, cover letter, interview prep, or match analysis. Attach it to a job with job_id (recommended); omit job_id for general documents like a master resume. Re-saving the same type+title for a job creates a new version automatically. The candidate views and prints it on the website.",
    inputSchema: {
      type: "object",
      properties: {
        job_id: { type: "string" },
        doc_type: { type: "string", enum: DOC_TYPES },
        title: { type: "string", description: 'e.g. "Resume — Stripe SWE Intern"' },
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
    case "get_profile": {
      const [{ data: profileRow }, { data: entryRows }] = await Promise.all([
        supabase.from("profile").select("*").maybeSingle(),
        supabase
          .from("profile_entries")
          .select("*")
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true }),
      ]);
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

export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization") ?? "";
  const token = process.env.MCP_TOKEN;
  if (!token || auth !== `Bearer ${token}`) {
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
        serverInfo: { name: "career-copilot", version: "1.0.0" },
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
export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
