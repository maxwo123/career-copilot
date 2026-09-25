import { ActionForm } from "@/lib/action-form";
import {
  addProfileEntry,
  deleteProfileEntry,
  saveProfileHeader,
  updateProfileEntry,
  moveProfileEntry,
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

function EntryFields({ entry, section }: { entry?: ProfileEntry; section: Section }) {
  const labels = section === "education" ? ["Degree / qualification", "School / university"] : section === "projects" ? ["Project name", "Team / organization"] : section === "certifications" ? ["Certification", "Issuing organization"] : ["Role / title", "Organization"];
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={labels[0]}>
          <Input
            name="title"
            defaultValue={entry?.title}
            placeholder={section === "education" ? "B.S. Biology" : section === "projects" ? "Research project name" : section === "certifications" ? "Certification name" : "Research Intern"}
          />
        </Field>
        <Field label={labels[1]}>
          <Input
            name="organization"
            defaultValue={entry?.organization}
            placeholder="School, company, club..."
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
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

      </div>
      <Field label="Details" hint="one bullet per line">
        <Textarea name="description" rows={4} defaultValue={entry?.description} />
      </Field>
    </>
  );
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const [{ data: profileRow, error: profileError }, { data: entryRows, error: entriesError }] = await Promise.all([
    supabase.from("profile").select("*").maybeSingle(),
    supabase
      .from("profile_entries")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);
  const profile = profileRow as Profile | null;
  const entries = (entryRows ?? []) as ProfileEntry[];
  if (profileError || entriesError) return <div className="space-y-4"><PageHeader title="Master profile" /><p role="alert">Your profile couldn’t load. Refresh the page to try again.</p></div>;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        title="Master profile"
        description="Your experience, education, and skills in one place. Your connected assistant uses this profile to tailor documents."
      />

      {(profileError || entriesError) && <p role="alert" className="text-red-700 dark:text-red-300">Some profile details couldn’t load. Refresh before editing those sections.</p>}
      <nav aria-label="Profile sections" className="flex flex-wrap gap-2 text-sm">
        {["contact", ...SECTIONS].map((section) => <a key={section} href={`#${section}`} className="rounded-lg border border-stone-200 px-3 py-2 hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800">{section === "contact" ? "Contact & summary" : SECTION_LABELS[section as Section]}</a>)}
      </nav>
      {/* Header / contact */}
      <section id="contact" className="scroll-mt-24"><Card className="p-5">
        <SectionTitle>Contact &amp; summary</SectionTitle>
        <ActionForm cancel action={saveProfileHeader} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name">
              <Input name="full_name" defaultValue={profile?.full_name} />
            </Field>
            <Field label="Email">
              <Input name="email" type="email" defaultValue={profile?.email} />
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
        </ActionForm>
      </Card></section>

      {/* Sections */}
      {SECTIONS.map((section: Section) => {
        const sectionEntries = entries.filter((e) => e.section === section);
        if (section === "skills") {
          return <SkillsManager key={section} entries={sectionEntries} />;
        }
        return (
          <section key={section} id={section} className="scroll-mt-24"><Card className="p-5">
            <SectionTitle count={sectionEntries.length}>
              {SECTION_LABELS[section]}
            </SectionTitle>

            {sectionEntries.length > 0 && (
              <div className="mt-4 space-y-2">
                {sectionEntries.map((entry, index) => (
                  <Disclosure
                    key={entry.id}
                    header={
                      <>
                        <span className="min-w-0 flex-1 break-words">
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
                        <span className="shrink-0 text-xs text-stone-500 dark:text-stone-400 tabular-nums">
                          {entry.date_range}
                        </span>
                      </>
                    }
                    preview={entry.description}
                  >
                    <div className="mb-4 flex gap-2">
                      <ActionForm label={`Move ${entry.title} up`} action={moveProfileEntry.bind(null, entry.id, "up")}><Button variant="secondary" size="sm" disabled={index === 0}>Move up</Button></ActionForm>
                      <ActionForm label={`Move ${entry.title} down`} action={moveProfileEntry.bind(null, entry.id, "down")}><Button variant="secondary" size="sm" disabled={index === sectionEntries.length - 1}>Move down</Button></ActionForm>
                    </div>
                    <ActionForm
                      cancel action={updateProfileEntry.bind(null, entry.id)}
                      className="space-y-4"
                    >
                      <EntryFields entry={entry} section={section} />
                      <Button size="sm">Save</Button>
                    </ActionForm>
                    <ActionForm
                      action={deleteProfileEntry.bind(null, entry.id)}
                      className="mt-3"
                    >
                      <DeleteButton label="Delete entry" message="Delete this profile entry? This cannot be undone." />
                    </ActionForm>
                  </Disclosure>
                ))}
              </div>
            )}

            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-indigo-600 dark:text-indigo-400 transition-colors hover:text-indigo-700 dark:hover:text-indigo-300">
                + Add {SECTION_LABELS[section].toLowerCase()} entry
              </summary>
              <ActionForm resetOnSuccess action={addProfileEntry} className="mt-4 space-y-4">
                <input type="hidden" name="section" value={section} />
                <EntryFields section={section} />
                <Button size="sm">Add entry</Button>
              </ActionForm>
            </details>
          </Card></section>
        );
      })}
    </div>
  );
}
import { DeleteButton } from "@/lib/delete-button";
