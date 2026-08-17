import {
  addProfileEntry,
  deleteProfileEntry,
  saveProfileHeader,
  updateProfileEntry,
} from "@/app/actions";
import { createClient } from "@/lib/supabase/server";
import type { Profile, ProfileEntry, Section } from "@/lib/types";
import { SECTIONS, SECTION_LABELS } from "@/lib/types";
import { SkillsManager } from "./skills-manager";

const inputCls =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500";

function EntryFields({ entry }: { entry?: ProfileEntry }) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium">Title</span>
          <input
            name="title"
            defaultValue={entry?.title}
            placeholder="B.S. Computer Science / Software Intern / Project name / Skill group"
            className={`mt-1 ${inputCls}`}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Organization</span>
          <input
            name="organization"
            defaultValue={entry?.organization}
            placeholder="School, company, club..."
            className={`mt-1 ${inputCls}`}
          />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-sm">
          <span className="font-medium">Location</span>
          <input name="location" defaultValue={entry?.location} className={`mt-1 ${inputCls}`} />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Dates</span>
          <input
            name="date_range"
            defaultValue={entry?.date_range}
            placeholder="Aug 2024 – May 2028"
            className={`mt-1 ${inputCls}`}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Sort order</span>
          <input
            name="sort_order"
            type="number"
            defaultValue={entry?.sort_order ?? 0}
            className={`mt-1 ${inputCls}`}
          />
        </label>
      </div>
      <label className="block text-sm">
        <span className="font-medium">
          Details (one bullet per line; for skills, a comma-separated list)
        </span>
        <textarea
          name="description"
          rows={4}
          defaultValue={entry?.description}
          className={`mt-1 ${inputCls}`}
        />
      </label>
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
      <div>
        <h1 className="text-xl font-bold">Master profile</h1>
        <p className="mt-1 text-sm text-stone-500">
          This is the source of truth Claude tailors every resume from. Be
          generous — include everything; tailoring means cutting, not
          inventing.
        </p>
      </div>

      {/* Header / contact */}
      <section className="rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
          Contact & summary
        </h2>
        <form action={saveProfileHeader} className="mt-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium">Full name</span>
              <input name="full_name" defaultValue={profile?.full_name} className={`mt-1 ${inputCls}`} />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Email</span>
              <input name="email" defaultValue={profile?.email} className={`mt-1 ${inputCls}`} />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Phone</span>
              <input name="phone" defaultValue={profile?.phone} className={`mt-1 ${inputCls}`} />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Location</span>
              <input name="location" defaultValue={profile?.location} className={`mt-1 ${inputCls}`} />
            </label>
            <label className="block text-sm">
              <span className="font-medium">LinkedIn URL</span>
              <input name="linkedin_url" defaultValue={profile?.linkedin_url} className={`mt-1 ${inputCls}`} />
            </label>
            <label className="block text-sm">
              <span className="font-medium">GitHub URL</span>
              <input name="github_url" defaultValue={profile?.github_url} className={`mt-1 ${inputCls}`} />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="font-medium">Website / portfolio</span>
              <input name="website_url" defaultValue={profile?.website_url} className={`mt-1 ${inputCls}`} />
            </label>
          </div>
          <label className="block text-sm">
            <span className="font-medium">Professional summary</span>
            <textarea
              name="summary"
              rows={3}
              defaultValue={profile?.summary}
              className={`mt-1 ${inputCls}`}
            />
          </label>
          <button className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
            Save contact info
          </button>
        </form>
      </section>

      {/* Sections */}
      {SECTIONS.map((section: Section) => {
        const sectionEntries = entries.filter((e) => e.section === section);
        if (section === "skills") {
          return <SkillsManager key={section} entries={sectionEntries} />;
        }
        return (
          <section
            key={section}
            className="rounded-xl border border-stone-200 bg-white p-5"
          >
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
              {SECTION_LABELS[section]} ({sectionEntries.length})
            </h2>

            <div className="mt-3 space-y-2">
              {sectionEntries.map((entry) => (
                <details
                  key={entry.id}
                  className="rounded-lg border border-stone-200"
                >
                  <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm">
                    <span className="font-medium">
                      {entry.title || "(untitled)"}
                    </span>
                    {entry.organization && (
                      <span className="text-stone-500">
                        · {entry.organization}
                      </span>
                    )}
                    <span className="ml-auto text-xs text-stone-400">
                      {entry.date_range}
                    </span>
                  </summary>
                  <div className="border-t border-stone-100 p-3">
                    <form
                      action={updateProfileEntry.bind(null, entry.id)}
                      className="space-y-3"
                    >
                      <EntryFields entry={entry} />
                      <div className="flex items-center gap-3">
                        <button className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700">
                          Save
                        </button>
                      </div>
                    </form>
                    <form
                      action={deleteProfileEntry.bind(null, entry.id)}
                      className="mt-2"
                    >
                      <button className="text-xs text-stone-400 hover:text-red-600">
                        Delete entry
                      </button>
                    </form>
                  </div>
                </details>
              ))}
            </div>

            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-medium text-indigo-600">
                + Add {SECTION_LABELS[section].toLowerCase()} entry
              </summary>
              <form action={addProfileEntry} className="mt-3 space-y-3">
                <input type="hidden" name="section" value={section} />
                <EntryFields />
                <button className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700">
                  Add entry
                </button>
              </form>
            </details>
          </section>
        );
      })}
    </div>
  );
}
