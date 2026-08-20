import {
  addProfileEntry,
  deleteProfileEntry,
  saveProfileHeader,
  updateProfileEntry,
} from "@/app/actions";
import { createClient } from "@/lib/supabase/server";
import { Disclosure } from "@/lib/disclosure";
import type { Profile, ProfileEntry, Section } from "@/lib/types";
import { SECTIONS, SECTION_LABELS } from "@/lib/types";
import {
  Button,
  Card,
  Field,
  Input,
  PageHeader,
  SectionTitle,
  Textarea,
} from "@/lib/ui";
import { SkillsManager } from "./skills-manager";

function EntryFields({ entry }: { entry?: ProfileEntry }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title">
          <Input
            name="title"
            defaultValue={entry?.title}
            placeholder="B.S. Computer Science / Software Intern / Project name"
          />
        </Field>
        <Field label="Organization">
          <Input
            name="organization"
            defaultValue={entry?.organization}
            placeholder="School, company, club..."
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Location">
          <Input name="location" defaultValue={entry?.location} />
        </Field>
        <Field label="Dates">
          <Input
            name="date_range"
            defaultValue={entry?.date_range}
            placeholder="Aug 2024 – May 2028"
          />
        </Field>
        <Field label="Sort order">
          <Input
            name="sort_order"
            type="number"
            defaultValue={entry?.sort_order ?? 0}
          />
        </Field>
      </div>
      <Field label="Details" hint="one bullet per line">
        <Textarea name="description" rows={4} defaultValue={entry?.description} />
      </Field>
    </>
  );
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const [{ data: profileRow }, { data: entryRows }] = await Promise.all([
    supabase.from("profile").select("*").maybeSingle(),
    supabase
      .from("profile_entries")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);
  const profile = profileRow as Profile | null;
  const entries = (entryRows ?? []) as ProfileEntry[];

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        title="Master profile"
        description="This is the source of truth Claude tailors every resume from. Be generous — include everything; tailoring means cutting, not inventing."
      />

      {/* Header / contact */}
      <Card className="p-5">
        <SectionTitle>Contact &amp; summary</SectionTitle>
        <form action={saveProfileHeader} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name">
              <Input name="full_name" defaultValue={profile?.full_name} />
            </Field>
            <Field label="Email">
              <Input name="email" defaultValue={profile?.email} />
            </Field>
            <Field label="Phone">
              <Input name="phone" defaultValue={profile?.phone} />
            </Field>
            <Field label="Location">
              <Input name="location" defaultValue={profile?.location} />
            </Field>
            <Field label="LinkedIn URL">
              <Input name="linkedin_url" defaultValue={profile?.linkedin_url} />
            </Field>
            <Field label="GitHub URL">
              <Input name="github_url" defaultValue={profile?.github_url} />
            </Field>
            <Field label="Website / portfolio" className="sm:col-span-2">
              <Input name="website_url" defaultValue={profile?.website_url} />
            </Field>
          </div>
          <Field label="Professional summary">
            <Textarea name="summary" rows={3} defaultValue={profile?.summary} />
          </Field>
          <Button>Save contact info</Button>
        </form>
      </Card>

      {/* Sections */}
      {SECTIONS.map((section: Section) => {
        const sectionEntries = entries.filter((e) => e.section === section);
        if (section === "skills") {
          return <SkillsManager key={section} entries={sectionEntries} />;
        }
        return (
          <Card key={section} className="p-5">
            <SectionTitle count={sectionEntries.length}>
              {SECTION_LABELS[section]}
            </SectionTitle>

            {sectionEntries.length > 0 && (
              <div className="mt-4 space-y-2">
                {sectionEntries.map((entry) => (
                  <Disclosure
                    key={entry.id}
                    header={
                      <>
                        <span className="min-w-0 flex-1 truncate">
                          <span className="font-medium text-stone-900 dark:text-stone-100">
                            {entry.title || "(untitled)"}
                          </span>
                          {entry.organization && (
                            <span className="text-stone-500 dark:text-stone-400">
                              {" "}
                              · {entry.organization}
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 text-xs text-stone-400 tabular-nums">
                          {entry.date_range}
                        </span>
                      </>
                    }
                    preview={entry.description}
                  >
                    <form
                      action={updateProfileEntry.bind(null, entry.id)}
                      className="space-y-4"
                    >
                      <EntryFields entry={entry} />
                      <Button size="sm">Save</Button>
                    </form>
                    <form
                      action={deleteProfileEntry.bind(null, entry.id)}
                      className="mt-3"
                    >
                      <Button variant="danger" size="sm">
                        Delete entry
                      </Button>
                    </form>
                  </Disclosure>
                ))}
              </div>
            )}

            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-indigo-600 dark:text-indigo-400 transition-colors hover:text-indigo-700 dark:hover:text-indigo-300">
                + Add {SECTION_LABELS[section].toLowerCase()} entry
              </summary>
              <form action={addProfileEntry} className="mt-4 space-y-4">
                <input type="hidden" name="section" value={section} />
                <EntryFields />
                <Button size="sm">Add entry</Button>
              </form>
            </details>
          </Card>
        );
      })}
    </div>
  );
}
