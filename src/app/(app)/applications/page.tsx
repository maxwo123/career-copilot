import { calendarDaysUntil } from "@/lib/mutation";
import { ActionForm } from "@/lib/action-form";
import { JobList } from "./job-list";
import Link from "next/link";
import { DeleteButton } from "@/lib/delete-button";
import {
  addTimelineEvent,
  deleteTimelineEvent,
  trackTimelineEvent,
} from "@/app/actions";
import { createClient } from "@/lib/supabase/server";
import type { Job, JobStatus, TimelineEvent } from "@/lib/types";
import { JOB_STATUSES } from "@/lib/types";
import {
  Button,
  Card,
  Field,
  Input,
  PageHeader,
  SectionTitle,
  Select,
  Textarea,
  buttonCls,
  cn,
  formatDate,
} from "@/lib/ui";

function deadlineLabel(days: number): string {
  if (days < 0) return "past due";
  if (days === 0) return "due today";
  return `${days} day${days === 1 ? "" : "s"} left`;
}

function monthKey(dateStr: string | null): string {
  if (!dateStr) return "Undated";
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "Undated";
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function windowState(e: TimelineEvent): "past" | "open" | "upcoming" {
  const today = new Date().toISOString().slice(0, 10);
  if (e.ends_on && e.ends_on < today) return "past";
  if (e.starts_on && e.starts_on <= today) return "open";
  return "upcoming";
}

export default async function ApplicationsPage({ searchParams }: {
  searchParams: Promise<{ q?: string; status?: string; view?: string; window?: string }>;
}) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const status = JOB_STATUSES.includes(params.status as JobStatus) ? params.status as JobStatus : "";
  const view = params.view === "timeline" ? "timeline" : "jobs";
  const windowFilter = ["open", "upcoming", "past"].includes(params.window ?? "") ? params.window : "";
  const returnTo = `/applications?${new URLSearchParams(view === "timeline" ? { view, ...(windowFilter ? { window: windowFilter } : {}) } : { view, ...(query ? { q: query } : {}), ...(status ? { status } : {}) })}`;
  const jobHref = (id: string) => `/jobs/${id}?${new URLSearchParams({ returnTo })}`;
  const supabase = await createClient();
  const [{ data: jobRows, error: jobsError }, { data: eventRows, error: eventsError }] = await Promise.all([
    supabase.from("jobs").select("*").order("created_at", { ascending: false }),
    supabase
      .from("timeline_events")
      .select("*")
      .order("starts_on", { ascending: true, nullsFirst: false })
      .order("company", { ascending: true }),
  ]);
  const jobs = (jobRows ?? []) as Job[];
  const events = (eventRows ?? []) as TimelineEvent[];
  const dueSoon = jobs
    .filter((j) => j.status === "saved" && j.deadline)
    .map((j) => ({ job: j, days: calendarDaysUntil(j.deadline!) }))
    .filter((x) => x.days !== null && x.days <= 10)
    .sort((a, b) => a.days - b.days);

  // Group timeline events into ordered month buckets; undated go last.
  const groups: { label: string; events: TimelineEvent[] }[] = [];
  for (const e of events.filter((event) => !windowFilter || windowState(event) === windowFilter)) {
    const label = monthKey(e.starts_on);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.events.push(e);
    else groups.push({ label, events: [e] });
  }
  const undatedIdx = groups.findIndex((g) => g.label === "Undated");
  if (undatedIdx >= 0) groups.push(...groups.splice(undatedIdx, 1));

  return (
    <div className="space-y-10">
      <PageHeader
        title="Applications"
        description="Find your next opportunity and stay ahead of application deadlines."
      />
      {(jobsError || eventsError) && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">Some applications couldn’t load. Refresh the page to try again.</p>}

      <nav aria-label="Application views" className="flex gap-2 border-b border-stone-200 pb-3 dark:border-stone-700">
        <Link href="/applications?view=jobs" aria-current={view === "jobs" ? "page" : undefined} className={buttonCls(view === "jobs" ? "primary" : "ghost")}>Tracked jobs</Link>
        <Link href="/applications?view=timeline" aria-current={view === "timeline" ? "page" : undefined} className={buttonCls(view === "timeline" ? "primary" : "ghost")}>Recruiting timeline</Link>
      </nav>
      {view === "jobs" && <>
      {[true, false].map((overdue) => { const deadlines = dueSoon.filter(({ days }) => overdue ? days < 0 : days >= 0); return deadlines.length > 0 && (
        <section key={String(overdue)}>
          <SectionTitle count={deadlines.length}>{overdue ? "Overdue applications" : "Deadlines coming up"}</SectionTitle>
          <Card className="mt-3 divide-y divide-amber-100 dark:divide-amber-900/50 border-amber-200 dark:border-amber-900 bg-amber-50/60 dark:bg-amber-950/30">
            {deadlines.map(({ job, days }) => (
              <div
                key={job.id}
                className="flex items-baseline justify-between gap-4 px-4 py-2.5 text-sm"
              >
                <Link
                  href={jobHref(job.id)}
                  className="min-w-0 truncate font-medium text-amber-950 dark:text-amber-200 hover:text-indigo-700 dark:hover:text-indigo-300"
                >
                  {job.title}
                  <span className="font-normal text-amber-900 dark:text-amber-200">
                    {" "}
                    · {job.company}
                  </span>
                </Link>
                <span
                  className={cn(
                    "shrink-0 text-xs font-medium tabular-nums",
                    days <= 2 ? "text-red-600 dark:text-red-400" : "text-amber-700 dark:text-amber-400"
                  )}
                >
                  {deadlineLabel(days)}
                </span>
              </div>
            ))}
          </Card>
        </section>
      ); })}

      {!jobsError && <JobList key={`${query}:${status}`} jobs={jobs} initialQuery={query} initialStatus={status} />}

      </>}
      {/* Application-window timeline */}
      {view === "timeline" && <section>
        <form action="/applications" method="get" className="mb-5 flex flex-wrap items-end gap-3">
          <input type="hidden" name="view" value="timeline" />
          <Field label="Recruiting window"><Select name="window" defaultValue={windowFilter}><option value="">All windows</option><option value="open">Open now</option><option value="upcoming">Upcoming</option><option value="past">Past</option></Select></Field>
          <Button>Apply filter</Button>
        </form>
        {groups.length === 0 && <p className="mb-4 text-sm text-stone-600 dark:text-stone-400">No recruiting windows match this view. Add an event below or change the filter.</p>}
        <SectionTitle count={events.length}>Application timeline</SectionTitle>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500 dark:text-stone-400">
          When each company&apos;s application window opens — so you apply in
          week one, not week six. Ask your AI to research companies and import
          their timelines through your connected assistant.
        </p>

        {events.length > 0 && (
          <div className="relative mt-5 space-y-10 before:absolute before:top-1.5 before:bottom-1.5 before:left-[7px] before:w-px before:bg-stone-200">
            {groups.map((group) => {
              const groupOpen = group.events.some((e) => windowState(e) === "open");
              const groupPast = group.events.every((e) => windowState(e) === "past");
              return (
                <section key={group.label} className="relative pl-9">
                  <span
                    className={cn(
                      "absolute top-0.5 left-0 size-[15px] rounded-full border-[3px] bg-white dark:bg-stone-800",
                      groupOpen
                        ? "border-indigo-500"
                        : groupPast
                          ? "border-stone-200 dark:border-stone-700"
                          : "border-stone-300 dark:border-stone-600"
                    )}
                  />
                  <h2
                    className={cn(
                      "text-xs font-semibold tracking-wider uppercase",
                      groupPast ? "text-stone-500" : "text-stone-600 dark:text-stone-300"
                    )}
                  >
                    {group.label}
                  </h2>
                  <div className="mt-3 space-y-3">
                    {group.events.map((e) => {
                      const state = windowState(e);
                      return (
                        <Card
                          key={e.id}
                          className={cn("p-4", state === "past" && "border-dashed")}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-baseline gap-x-2">
                                <span className="font-medium text-stone-900 dark:text-stone-100">
                                  {e.company}
                                </span>
                                {e.program && (
                                  <span className="text-sm text-stone-500 dark:text-stone-400">
                                    {e.program}
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs tabular-nums">
                                {e.window_label && (
                                  <span className="font-medium text-stone-600 dark:text-stone-300">
                                    {e.window_label}
                                  </span>
                                )}
                                {e.ends_on && state !== "past" && (
                                  <span className="text-stone-500">
                                    closes {formatDate(e.ends_on)}
                                  </span>
                                )}
                                {e.url && (
                                  <a
                                    href={e.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="font-medium text-indigo-600 dark:text-indigo-400 underline underline-offset-2 hover:text-indigo-700 dark:hover:text-indigo-300"
                                  >
                                    Program page ↗
                                  </a>
                                )}
                              </div>
                            </div>
                            {state === "open" && (
                              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                                <span className="size-1.5 rounded-full bg-emerald-500" />
                                Open now
                              </span>
                            )}
                          </div>
                          {e.notes && (
                            <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap text-stone-600 dark:text-stone-300">
                              {e.notes}
                            </p>
                          )}
                          <div className="mt-3 flex items-center gap-2">
                            {e.job_id ? (
                              <Link
                                href={jobHref(e.job_id)}
                                className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                              >
                                View tracked job →
                              </Link>
                            ) : (
                              <ActionForm action={trackTimelineEvent.bind(null, e.id)}>
                                <input type="hidden" name="returnTo" value={returnTo} />
                                <Button variant="secondary" size="sm">
                                  Track as job
                                </Button>
                              </ActionForm>
                            )}
                            <ActionForm
                              action={deleteTimelineEvent.bind(null, e.id)}
                              className="ml-auto"
                            >
                              <DeleteButton message={`Delete the timeline event for ${e.company}? This cannot be undone.`} />
                            </ActionForm>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        <Card className="mt-6">
          <details>
            <summary className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-medium text-stone-800 dark:text-stone-200 transition-colors hover:bg-stone-50 dark:hover:bg-stone-700/60">
              <span>+ Add timeline event manually</span>
              <span className="text-xs text-stone-500 dark:text-stone-400">▾</span>
            </summary>
            <ActionForm
              resetOnSuccess action={addTimelineEvent}
              className="space-y-4 border-t border-stone-100 dark:border-stone-700/60 p-4"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Company" hint="required">
                  <Input name="company" required placeholder="Genentech" />
                </Field>
                <Field label="Program / role">
                  <Input name="program" placeholder="Summer Internship Program" />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Window label">
                  <Input
                    name="window_label"
                    placeholder="Nov 2026 – Mar 2027 (rolling)"
                  />
                </Field>
                <Field label="Window opens">
                  <Input name="starts_on" type="date" />
                </Field>
                <Field label="Window closes">
                  <Input name="ends_on" type="date" />
                </Field>
              </div>
              <Field label="Program URL">
                <Input name="url" type="url" placeholder="https://..." />
              </Field>
              <Field label="Notes" hint="eligibility, tips, sources">
                <Textarea name="notes" rows={3} />
              </Field>
              <Button>Add event</Button>
            </ActionForm>
          </details>
        </Card>
      </section>}
    </div>
  );
}
