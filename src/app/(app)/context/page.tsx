import { redirect } from "next/navigation";
import { ActionForm } from "@/lib/action-form";
import { CONTEXT_LIMIT, CONTEXT_SECTIONS, isContextSection } from "@/lib/personal-context";
import { createClient } from "@/lib/supabase/server";
import { Button, Card, Field, PageHeader, Textarea } from "@/lib/ui";

async function saveContext(form: FormData) {
  "use server";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to save personal context." };

  const section = form.get("section");
  const markdown = form.get("markdown");
  if (!isContextSection(section) || typeof markdown !== "string" || markdown.length > CONTEXT_LIMIT) {
    return { error: "Use a valid section and up to 20,000 characters." };
  }

  const { error } = await supabase.from("personal_context_sections").upsert({
    user_id: user.id,
    section,
    markdown: markdown.trim(),
    shared: form.get("shared") === "on",
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,section" });
  return error ? { error: "Could not save this section. Try again." } : { message: "Section saved." };
}

export default async function PersonalContextPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase.from("personal_context_sections")
    .select("section, markdown, shared")
    .eq("user_id", user.id);
  const sections = new Map(data?.map((row) => [row.section, row]));

  return (
    <div className="space-y-6">
      <PageHeader title="Personal context" description="Paste your exported context into the sections below. Choose which saved sections connected agents can read." />
      {error ? (
        <p role="alert">Personal context is unavailable. Check that the database migration has been applied.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {Object.entries(CONTEXT_SECTIONS).map(([section, label]) => {
            const entry = sections.get(section);
            return (
              <Card key={section} className="p-4">
                <ActionForm action={saveContext} label={label} className="space-y-3">
                  <input type="hidden" name="section" value={section} />
                  <Field label={label} hint="Markdown">
                    <Textarea name="markdown" rows={6} maxLength={CONTEXT_LIMIT} defaultValue={entry?.markdown ?? ""} />
                  </Field>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="shared" defaultChecked={entry?.shared ?? false} />
                      Share with connected agents
                    </label>
                    <Button size="sm">Save section</Button>
                  </div>
                </ActionForm>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
