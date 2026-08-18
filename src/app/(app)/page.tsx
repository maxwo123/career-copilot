import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Activity, CoachBlock, Job, JobStatus } from "@/lib/types";
import { JOB_STATUSES } from "@/lib/types";
import { BlocksEditor } from "./blocks-editor";
import {
  Card,
  STATUS_LABELS,
  SectionTitle,
  StatusPill,
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

export default async function Dashboard() {
  const supabase = await createClient();
  const [{ data: jobRows }, { data: activityRows }, { data: blockRows }] =
    await Promise.all([
      supabase.from("jobs").select("*").order("created_at", { ascending: false }),
      supabase
        .from("activity")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("coach_blocks")
        .select("id, kind, content, checked, sort_order")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
    ]);
  const jobs = (jobRows ?? []) as Job[];
  const activity = (activityRows ?? []) as Activity[];
  const blocks = (blockRows ?? []) as CoachBlock[];

  const byStatus = new Map<JobStatus, Job[]>(
    JOB_STATUSES.map((s) => [s, jobs.filter((j) => j.status === s)])
  );

  const dueSoon = jobs
    .filter((j) => j.status === "saved" && j.deadline)
    .map((j) => ({ job: j, days: daysUntil(j.deadline)! }))
    .filter((x) => x.days !== null && x.days <= 10)
    .sort((a, b) => a.days - b.days);

  return (
    <div className="space-y-10">
      {/* Pipeline stats */}
      <Card className="grid grid-cols-3 overflow-hidden sm:grid-cols-6 sm:divide-x sm:divide-stone-100">
        {JOB_STATUSES.map((s) => {
          const count = byStatus.get(s)!.length;
          return (
            <div key={s} className="px-4 py-3">
              <div
                className={cn(
                  "text-xl font-semibold tabular-nums",
                  count > 0 ? "text-stone-900" : "text-stone-300"
                )}
              >
                {count}
              </div>
              <div className="mt-0.5 text-xs font-medium text-stone-500">
                {STATUS_LABELS[s]}
              </div>
            </div>
          );
        })}
      </Card>

      <section>
        <SectionTitle
          count={blocks.filter((b) => b.kind === "task" && !b.checked).length}
        >
          Notes &amp; actions
        </SectionTitle>
        <Card className="mt-3 px-1 py-2">
          <BlocksEditor initialBlocks={blocks} />
        </Card>
      </section>

      {dueSoon.length > 0 && (
        <section>
          <SectionTitle count={dueSoon.length}>Deadlines coming up</SectionTitle>
          <Card className="mt-3 divide-y divide-amber-100 border-amber-200 bg-amber-50/60">
            {dueSoon.map(({ job, days }) => (
              <div
                key={job.id}
                className="flex items-baseline justify-between gap-4 px-4 py-2.5 text-sm"
              >
                <Link
                  href={`/jobs/${job.id}`}
                  className="min-w-0 truncate font-medium text-amber-950 hover:text-indigo-700"
                >
                  {job.title}
                  <span className="font-normal text-amber-800/70">
                    {" "}
                    · {job.company}
                  </span>
                </Link>
                <span
                  className={cn(
                    "shrink-0 text-xs font-medium tabular-nums",
                    days <= 2 ? "text-red-600" : "text-amber-700"
                  )}
                >
                  {deadlineLabel(days)}
                </span>
              </div>
            ))}
          </Card>
        </section>
      )}

      {jobs.length === 0 ? (
        <Card className="border-dashed p-12 text-center shadow-none">
          <h2 className="text-lg font-semibold text-stone-900">No jobs yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-stone-500">
            Add your first job posting (link + pasted description), fill out
            your{" "}
            <Link href="/profile" className="font-medium text-indigo-600 underline underline-offset-2">
              profile
            </Link>
            , then ask Claude Code to tailor a resume for it.
          </p>
          <Link
            href="/jobs/new"
            className={buttonCls("primary", "md", "mt-6")}
          >
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
                    className="group rounded-xl border border-stone-200 bg-white p-4 shadow-xs transition hover:border-indigo-300 hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-stone-900 group-hover:text-indigo-700">
                          {job.title}
                        </div>
                        <div className="mt-0.5 truncate text-sm text-stone-500">
                          {job.company}
                          {job.location ? ` · ${job.location}` : ""}
                        </div>
                      </div>
                      <StatusPill status={job.status} />
                    </div>
                    <div className="mt-3 flex items-center gap-3 text-xs text-stone-400 tabular-nums">
                      {job.deadline && (
                        <span>Due {formatDate(job.deadline)}</span>
                      )}
                      {job.applied_at && (
                        <span>Applied {formatDate(job.applied_at)}</span>
                      )}
                      {!job.deadline && !job.applied_at && (
                        <span>Added {formatDate(job.created_at)}</span>
                      )}
                      {!job.jd_text && (
                        <span className="font-medium text-amber-600">
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

      {activity.length > 0 && (
        <section>
          <SectionTitle>Recent activity</SectionTitle>
          <Card className="mt-3 divide-y divide-stone-100">
            {activity.map((a) => (
              <div
                key={a.id}
                className="flex items-start gap-2.5 px-4 py-2.5 text-sm text-stone-600"
              >
                <span
                  className={cn(
                    "mt-1.5 size-1.5 shrink-0 rounded-full",
                    a.actor === "claude" ? "bg-indigo-500" : "bg-stone-300"
                  )}
                  title={a.actor === "claude" ? "Claude" : "You"}
                />
                <span className="min-w-0 flex-1">{a.detail || a.action}</span>
                <span className="shrink-0 text-xs text-stone-400 tabular-nums">
                  {formatDate(a.created_at)}
                </span>
              </div>
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}
