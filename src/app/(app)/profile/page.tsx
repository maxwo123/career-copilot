import {
  addProfileEntry,
  deleteProfileEntry,
  saveCareerNarrative,
  saveProfileHeader,
  updateProfileEntry,
} from "@/app/actions";
import { createClient } from "@/lib/supabase/server";
import type { CareerNarrative, Profile, ProfileEntry, Section } from "@/lib/types";
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
  const [{ data: profileRow }, { data: entryRows }, { data: narrativeRow }] =
    await Promise.all([
      supabase.from("profile").select("*").maybeSingle(),
      supabase
        .from("profile_entries")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase.from("career_narrative").select("*").maybeSingle(),
    ]);
  const profile = profileRow as Profile | null;
  const entries = (entryRows ?? []) as ProfileEntry[];
  const narrative = narrativeRow as CareerNarrative | null;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        title="Master profile"
        description="This is the source of truth Claude tailors every resume from. Be generous — include everything; tailoring means cutting, not inventing."
      />

      {/* Career narrative — the holistic picture AI coaches read first */}
      <Card className="p-5">
        <SectionTitle>Career narrative</SectionTitle>
        <p className="mt-2 text-sm leading-relaxed text-stone-500">
          The holistic picture every connected AI reads before giving guidance
          — where you started, where you are, where you&apos;re going. Fill it
          in by hand, or better: ask your AI to{" "}
          <code className="rounded-md bg-stone-100 px-1.5 py-0.5 font-mono text-xs">
            interview me and fill in my career narrative in Career Copilot
          </code>
        </p>
        <form action={saveCareerNarrative} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Where I started">
              <Textarea
                name="starting_point"
                rows={3}
                defaultValue={narrative?.starting_point}
                placeholder="Background, first exposures to the field..."
              />
            </Field>
            <Field label="Where I am now">
              <Textarea
                name="current_state"
                rows={3}
                defaultValue={narrative?.current_state}
                placeholder="Skills, experience, industry-knowledge level..."
              />
            </Field>
            <Field label="Where I'm headed">
              <Textarea
                name="goals"
                rows={3}
                defaultValue={narrative?.goals}
                placeholder="Target roles, industry, timeframe..."
              />
            </Field>
            <Field label="Interests">
              <Textarea
                name="interests"
                rows={3}
                defaultValue={narrative?.interests}
                placeholder="Topics, problems, environments that pull you..."
              />
            </Field>
            <Field label="Constraints">
              <Textarea
                name="constraints_text"
                rows={3}
                defaultValue={narrative?.constraints_text}
                placeholder="Time, location, finances, GPA..."
              />
            </Field>
            <Field label="Gap analysis">
              <Textarea
                name="gap_analysis"
                rows={3}
                defaultValue={narrative?.gap_analysis}
                placeholder="What stands between now and the goal..."
              />
            </Field>
          </div>
          {narrative?.coach_notes && (
            <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-3">
              <div className="text-xs font-semibold tracking-wider text-indigo-400 uppercase">
                Coach notes (AI-maintained)
              </div>
              <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap text-stone-600">
                {narrative.coach_notes}
              </p>
            </div>
          )}
          <Button>Save narrative</Button>
        </form>
      </Card>

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
                  <details
                    key={entry.id}
                    className="rounded-lg border border-stone-200"
                  >
                    <summary className="grid cursor-pointer grid-cols-[1fr_auto] items-baseline gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-stone-50">
                      <span className="min-w-0 truncate">
                        <span className="font-medium text-stone-900">
                          {entry.title || "(untitled)"}
                        </span>
                        {entry.organization && (
                          <span className="text-stone-500">
                            {" "}
                            · {entry.organization}
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-stone-400 tabular-nums">
                        {entry.date_range}
                      </span>
                    </summary>
                    <div className="border-t border-stone-100 p-4">
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
                    </div>
                  </details>
                ))}
              </div>
            )}

            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-700">
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
