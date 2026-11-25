import { CONTEXT_LIMIT, CONTEXT_SECTIONS, isContextSection } from "@/lib/personal-context";
import { createServiceClient } from "@/lib/supabase/service";

export const contextReadTool = {
  name: "get_personal_context",
  description: "Read the user's shared goals, projects, background, and preferences when relevant to the current task. Request a section for focused retrieval, or omit it to read all shared sections.",
  inputSchema: {
    type: "object",
    properties: { section: { type: "string", enum: Object.keys(CONTEXT_SECTIONS) } },
    additionalProperties: false,
  },
};

export const contextImportTool = {
  name: "import_personal_context",
  description: "Import Muse context as private Markdown sections after the user requests an export. Omit unknown sections. Existing sections are preserved and reported as skipped.",
  inputSchema: {
    type: "object",
    properties: {
      sections: {
        type: "object",
        properties: Object.fromEntries(Object.keys(CONTEXT_SECTIONS).map((section) => [
          section, { type: "string", minLength: 1, maxLength: CONTEXT_LIMIT },
        ])),
        minProperties: 1,
        additionalProperties: false,
      },
    },
    required: ["sections"],
    additionalProperties: false,
  },
};

export function personalContextOwner() {
  const owner = process.env.PERSONAL_CONTEXT_OWNER_ID ?? "";
  return /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(owner) ? owner : null;
}

export async function importContext(owner: string, args: unknown) {
  if (typeof args !== "object" || args === null || !("sections" in args) ||
    Object.keys(args).length !== 1 || typeof args.sections !== "object" ||
    args.sections === null || Array.isArray(args.sections)) {
    throw new Error("Provide a sections object with Markdown by section.");
  }
  const entries = Object.entries(args.sections);
  if (!entries.length) throw new Error("Provide at least one section.");
  const rows = entries.map(([section, markdown]) => {
    if (!isContextSection(section) || typeof markdown !== "string" ||
      markdown.length > CONTEXT_LIMIT || !markdown.trim() || markdown.includes("\0")) {
      throw new Error("Use supported section names and 1 to 20,000 characters of Markdown per section.");
    }
    return { user_id: owner, section, markdown: markdown.trim(), shared: false };
  });
  const { data, error } = await createServiceClient().from("personal_context_sections")
    .upsert(rows, { onConflict: "user_id,section", ignoreDuplicates: true })
    .select("section");
  if (error) throw new Error("Could not import personal context.");
  const inserted = new Set(data.map(({ section }) => section));
  return {
    imported: rows.filter(({ section }) => inserted.has(section)).map(({ section }) => section),
    skipped_existing: rows.filter(({ section }) => !inserted.has(section)).map(({ section }) => section),
  };
}

export async function readContext(owner: string, args: unknown) {
  if (typeof args !== "object" || args === null || Array.isArray(args)) {
    throw new Error("Expected an arguments object.");
  }
  const section = "section" in args ? args.section : undefined;
  if (section !== undefined && !isContextSection(section)) {
    throw new Error("Unknown personal context section.");
  }
  let query = createServiceClient().from("personal_context_sections")
    .select("section, markdown, updated_at")
    .eq("user_id", owner)
    .eq("shared", true)
    .neq("markdown", "")
    .order("section");
  if (section) query = query.eq("section", section);
  const { data, error } = await query;
  if (error) throw new Error("Could not load personal context.");
  return { sections: data };
}
