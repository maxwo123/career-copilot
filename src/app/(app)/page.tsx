import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Activity, Job, JobStatus } from "@/lib/types";
import { JOB_STATUSES } from "@/lib/types";
import { STATUS_LABELS, StatusPill, daysUntil, formatDate } from "@/lib/ui";

export default async function Dashboard() {
  const supabase = await createClient();
  const [{ data: jobRows }, { data: activityRows }] = await Promise.all([
    supabase.from("jobs").select("*").order("created_at", { ascending: false }),
    supabase
      .from("activity")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);
  const jobs = (jobRows ?? []) as Job[];
  const activity = (activityRows ?? []) as Activity[];

  const byStatus = new Map<JobStatus, Job[]>(
    JOB_STATUSES.map((s) => [s, jobs.filter((j) => j.status === s)])
  );

  const dueSoon = jobs
    .filter((j) => j.status === "saved" && j.deadline)
    .map((j) => ({ job: j, days: daysUntil(j.deadline)! }))
    .filter((x) => x.days !== null && x.days <= 10)
    .sort((a, b) => a.days - b.days);

  return (
    <div className="space-y-8">
      {/* Stats */}
      <section className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {JOB_STATUSES.map((s) => (
          <div
            key={s}
            className="rounded-xl border border-stone-200 bg-white p-3 text-center"
          >
            <div className="text-2xl font-bold">{byStatus.get(s)!.length}</div>
            <div className="text-xs text-stone-500">{STATUS_LABELS[s]}</div>
          </div>
        ))}
      </section>

      {dueSoon.length > 0 && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="text-sm font-semibold text-amber-900">
            Deadlines coming up
          </h2>
          <ul className="mt-2 space-y-1 text-sm text-amber-800">
            {dueSoon.map(({ job, days }) => (
              <li key={job.id}>
                <Link href={`/jobs/${job.id}`} className="underline">
                  {job.title} @ {job.company}
                </Link>{" "}
                — {days < 0 ? "past due" : days === 0 ? "due today" : `${days} day${days === 1 ? "" : "s"} left`}
              </li>
            ))}
          </ul>
        </section>
      )}

      {jobs.length === 0 ? (
        <section className="rounded-xl border border-dashed border-stone-300 bg-white p-10 text-center">
          <h2 className="text-lg font-semibold">No jobs yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-stone-500">
            Add your first job posting (link + pasted description), fill out
            your <Link href="/profile" className="text-indigo-600 underline">profile</Link>,
            then ask Claude Code to tailor a resume for it.
          </p>
          <Link
            href="/jobs/new"
            className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            + Add your first job
          </Link>
        </section>
      ) : (
        <section className="space-y-6">
          {JOB_STATUSES.filter((s) => byStatus.get(s)!.length > 0).map((s) => (
            <div key={s}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">
                {STATUS_LABELS[s]} ({byStatus.get(s)!.length})
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {byStatus.get(s)!.map((job) => (
                  <Link
                    key={job.id}
                    href={`/jobs/${job.id}`}
                    className="rounded-xl border border-stone-200 bg-white p-4 transition hover:border-indigo-300 hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold">{job.title}</div>
                        <div className="text-sm text-stone-500">
                          {job.company}
                          {job.location ? ` · ${job.location}` : ""}
                        </div>
                      </div>
                      <StatusPill status={job.status} />
                    </div>
                    <div className="mt-2 flex gap-3 text-xs text-stone-400">
                      {job.deadline && <span>Due {formatDate(job.deadline)}</span>}
                      {job.applied_at && (
                        <span>Applied {formatDate(job.applied_at)}</span>
                      )}
                      {!job.jd_text && (
                        <span className="text-amber-600">No JD pasted</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {activity.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">
            Recent activity
          </h2>
          <ul className="space-y-1 rounded-xl border border-stone-200 bg-white p-4 text-sm">
            {activity.map((a) => (
              <li key={a.id} className="flex gap-2 text-stone-600">
                <span
                  className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${a.actor === "claude" ? "bg-indigo-400" : "bg-stone-300"}`}
                  title={a.actor}
                />
                <span>{a.detail || a.action}</span>
                <span className="ml-auto shrink-0 text-xs text-stone-400">
                  {formatDate(a.created_at)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
