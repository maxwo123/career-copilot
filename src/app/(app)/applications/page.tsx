import Link from "next/link";
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
  STATUS_LABELS,
  SectionTitle,
  StatusPill,
  Textarea,
  buttonCls,
  cn,
  daysUntil,
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

export default async function ApplicationsPage() {
  const supabase = await createClient();
  const [{ data: jobRows }, { data: eventRows }] = await Promise.all([
    supabase.from("jobs").select("*").order("created_at", { ascending: false }),
    supabase
      .from("timeline_events")
      .select("*")
      .order("starts_on", { ascending: true, nullsFirst: false })
      .order("company", { ascending: true }),
  ]);
  const jobs = (jobRows ?? []) as Job[];
  const events = (eventRows ?? []) as TimelineEvent[];

  const byStatus = new Map<JobStatus, Job[]>(
    JOB_STATUSES.map((s) => [s, jobs.filter((j) => j.status === s)])
  );

  const dueSoon = jobs
    .filter((j) => j.status === "saved" && j.deadline)
    .map((j) => ({ job: j, days: daysUntil(j.deadline)! }))
    .filter((x) => x.days !== null && x.days <= 10)
    .sort((a, b) => a.days - b.days);

  // Group timeline events into ordered month buckets; undated go last.
  const groups: { label: string; events: TimelineEvent[] }[] = [];
  for (const e of events) {
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
        description="Everything application-related in one place: your pipeline, upcoming deadlines, tracked jobs, and the timeline of when each company's application window opens."
      />

      {/* Pipeline stats */}
      <Card className="grid grid-cols-3 overflow-hidden sm:grid-cols-6 sm:divide-x sm:divide-stone-100 dark:sm:divide-stone-700/60">
        {JOB_STATUSES.map((s) => {
          const count = byStatus.get(s)!.length;
          return (
            <div key={s} className="px-4 py-3">
              <div
                className={cn(
                  "text-xl font-semibold tabular-nums",
                  count > 0 ? "text-stone-900 dark:text-stone-100" : "text-stone-300 dark:text-stone-600"
                )}
              >
                {count}
              </div>
              <div className="mt-0.5 text-xs font-medium text-stone-500 dark:text-stone-400">
                {STATUS_LABELS[s]}
              </div>
            </div>
          );
        })}
      </Card>

      {dueSoon.length > 0 && (
        <section>
          <SectionTitle count={dueSoon.length}>Deadlines coming up</SectionTitle>
          <Card className="mt-3 divide-y divide-amber-100 dark:divide-amber-900/50 border-amber-200 dark:border-amber-900 bg-amber-50/60 dark:bg-amber-950/30">
            {dueSoon.map(({ job, days }) => (
              <div
                key={job.id}
                className="flex items-baseline justify-between gap-4 px-4 py-2.5 text-sm"
              >
                <Link
                  href={`/jobs/${job.id}`}
                  className="min-w-0 truncate font-medium text-amber-950 dark:text-amber-200 hover:text-indigo-700 dark:hover:text-indigo-300"
                >
                  {job.title}
                  <span className="font-normal text-amber-800/70 dark:text-amber-300/70">
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
      )}

      {/* Tracked jobs */}
      {jobs.length === 0 ? (
        <Card className="border-dashed p-12 text-center shadow-none">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">No jobs yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-stone-500 dark:text-stone-400">
            Add your first job posting (link + pasted description), fill out
            your{" "}
            <Link
              href="/profile"
              className="font-medium text-indigo-600 dark:text-indigo-400 underline underline-offset-2"
            >
              profile
            </Link>
            , then ask Claude Code to tailor a resume for it.
          </p>
          <Link href="/jobs/new" className={buttonCls("primary", "md", "mt-6")}>
            + Add your first job
          </Link>
        </Card>
      ) : (
        <div className="space-y-8">
          {JOB_STATUSES.filter((s) => byStatus.get(s)!.length > 0).map((s) => (
            <section key={s}>
              <SectionTitle count={byStatus.get(s)!.length}>
                {STATUS_LABELS[s]}
              </SectionTitle>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {byStatus.get(s)!.map((job) => (
                  <Link
                    key={job.id}
                    href={`/jobs/${job.id}`}
                    className="group rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-4 shadow-xs transition hover:border-indigo-300 hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-stone-900 dark:text-stone-100 group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                          {job.title}
                        </div>
                        <div className="mt-0.5 truncate text-sm text-stone-500 dark:text-stone-400">
                          {job.company}
                          {job.location ? ` · ${job.location}` : ""}
                        </div>
                      </div>
                      <StatusPill status={job.status} />
                    </div>
                    <div className="mt-3 flex items-center gap-3 text-xs text-stone-400 tabular-nums">
                      {job.deadline && <span>Due {formatDate(job.deadline)}</span>}
                      {job.applied_at && (
                        <span>Applied {formatDate(job.applied_at)}</span>
                      )}
                      {!job.deadline && !job.applied_at && (
                        <span>Added {formatDate(job.created_at)}</span>
                      )}
                      {!job.jd_text && (
                        <span className="font-medium text-amber-600 dark:text-amber-500">
                          No JD pasted
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Application-window timeline */}
      <section>
        <SectionTitle count={events.length}>Application timeline</SectionTitle>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500 dark:text-stone-400">
          When each company&apos;s application window opens — so you apply in
          week one, not week six. Ask your AI to research companies and import
          their timelines via MCP.
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
                      groupPast ? "text-stone-400" : "text-stone-600 dark:text-stone-300"
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
                          className={cn("p-4", state === "past" && "opacity-55")}
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
                                  <span className="text-stone-400">
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
                                href={`/jobs/${e.job_id}`}
                                className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                              >
                                View tracked job →
                              </Link>
                            ) : (
                              <form action={trackTimelineEvent.bind(null, e.id)}>
                                <Button variant="secondary" size="sm">
                                  Track as job
                                </Button>
                              </form>
                            )}
                            <form
                              action={deleteTimelineEvent.bind(null, e.id)}
                              className="ml-auto"
                            >
                              <Button variant="danger" size="sm">
                                Delete
                              </Button>
                            </form>
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
              <span className="text-xs text-stone-300 dark:text-stone-600">▾</span>
            </summary>
            <form
              action={addTimelineEvent}
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
            </form>
          </details>
        </Card>
      </section>
    </div>
  );
}
