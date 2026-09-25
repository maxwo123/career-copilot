"use client";

import { useState } from "react";
import Link from "next/link";
import type { Job, JobStatus } from "@/lib/types";
import { JOB_STATUSES } from "@/lib/types";
import { matchesJobSearch } from "@/lib/job-search";
import { Card, Field, Input, SectionTitle, Select, STATUS_LABELS, StatusPill, buttonCls, cn, formatDate } from "@/lib/ui";

export function JobList({ jobs, initialQuery, initialStatus }: {
  jobs: Job[];
  initialQuery: string;
  initialStatus: JobStatus | "";
}) {
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState<JobStatus | "">(initialStatus);
  const matchingJobs = jobs.filter((job) =>
    (!status || job.status === status) && matchesJobSearch(job, query)
  );

  function updateFilters(nextQuery: string, nextStatus: JobStatus | "") {
    setQuery(nextQuery);
    setStatus(nextStatus);
    const params = new URLSearchParams();
    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    if (nextStatus) params.set("status", nextStatus);
    window.history.replaceState(null, "", `/applications${params.size ? `?${params}` : ""}`);
  }

  const returnTo = `/applications${query.trim() || status ? `?${new URLSearchParams({ view: "jobs", ...(query.trim() ? { q: query.trim() } : {}), ...(status ? { status } : {}) })}` : ""}`;

  return (
    <>
      <Card className="grid grid-cols-3 overflow-hidden sm:grid-cols-6 sm:divide-x sm:divide-stone-100 dark:sm:divide-stone-700/60">
        {JOB_STATUSES.map((jobStatus) => {
          const count = jobs.filter((job) => job.status === jobStatus).length;
          return (
            <button
              key={jobStatus}
              type="button"
              onClick={() => updateFilters(query, status === jobStatus ? "" : jobStatus)}
              aria-label={`${STATUS_LABELS[jobStatus]}: ${count} ${count === 1 ? "job" : "jobs"}`}
              aria-pressed={status === jobStatus}
              className={cn("px-4 py-3 text-left transition-colors hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-indigo-600 dark:hover:bg-stone-700/50", status === jobStatus && "bg-indigo-50 dark:bg-indigo-950/40")}
            >
              <div className={cn("text-xl font-semibold tabular-nums", count ? "text-stone-900 dark:text-stone-100" : "text-stone-500 dark:text-stone-400")}>{count}</div>
              <div className="mt-0.5 text-xs font-medium text-stone-500 dark:text-stone-400">{STATUS_LABELS[jobStatus]}</div>
            </button>
          );
        })}
      </Card>

      <section aria-label="Tracked jobs">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <SectionTitle count={matchingJobs.length}>Tracked jobs</SectionTitle>
          <span className="sr-only" role="status" aria-live="polite">{matchingJobs.length} {matchingJobs.length === 1 ? "job" : "jobs"} found</span>
          <Link href="/jobs/new" className={buttonCls("primary")}>+ Add job</Link>
        </div>
        <div className="mb-4 flex flex-wrap items-end gap-3" role="search">
          <Field label="Find a job" className="min-w-0 grow basis-60">
            <Input
              name="q"
              type="search"
              value={query}
              onChange={(event) => updateFilters(event.target.value, status)}
              placeholder="Search role, company, or location…"
              autoComplete="off"
            />
          </Field>
          <Field label="Status" className="grow basis-40 sm:grow-0">
            <Select name="status" value={status} onChange={(event) => updateFilters(query, event.target.value as JobStatus | "")}>
              <option value="">All statuses</option>
              {JOB_STATUSES.map((jobStatus) => <option key={jobStatus} value={jobStatus}>{STATUS_LABELS[jobStatus]}</option>)}
            </Select>
          </Field>
          {(query || status) && <button type="button" onClick={() => updateFilters("", "")} className={buttonCls("ghost")}>Clear filters</button>}
        </div>

        {jobs.length === 0 ? (
          <Card className="border-dashed p-12 text-center shadow-none">
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">No jobs yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-stone-500 dark:text-stone-400">Add a job posting to start tracking applications and deadlines.</p>
            <Link href="/jobs/new" className={buttonCls("primary", "md", "mt-6")}>Add your first job</Link>
          </Card>
        ) : matchingJobs.length === 0 ? (
          <Card className="p-8 text-center">
            <h2 className="font-semibold">No matching jobs</h2>
            <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">Try another role, company, or location, or clear the filters.</p>
            <button type="button" onClick={() => updateFilters("", "")} className={buttonCls("secondary", "md", "mt-4")}>Show all jobs</button>
          </Card>
        ) : (
          <Card className="divide-y divide-stone-200 overflow-hidden dark:divide-stone-700">
            {matchingJobs.map((job) => (
              <Link
                key={job.id}
                href={`/jobs/${job.id}?${new URLSearchParams({ returnTo })}`}
                className="group flex flex-col gap-2 px-4 py-4 transition-colors hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-indigo-600 sm:flex-row sm:items-center sm:justify-between sm:gap-5 dark:hover:bg-stone-700/50"
              >
                <div className="min-w-0">
                  <div className="font-medium text-stone-900 group-hover:text-indigo-700 dark:text-stone-100 dark:group-hover:text-indigo-300">{job.title}</div>
                  <div className="mt-0.5 text-sm text-stone-600 dark:text-stone-400">{job.company}{job.location ? ` · ${job.location}` : ""}</div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-600 tabular-nums dark:text-stone-400 sm:justify-end">
                  {job.deadline && <span>Due {formatDate(job.deadline)}</span>}
                  {job.applied_at && <span>Applied {formatDate(job.applied_at)}</span>}
                  {!job.deadline && !job.applied_at && <span>Added {formatDate(job.created_at)}</span>}
                  {!job.jd_text && <span className="font-medium text-amber-600 dark:text-amber-500">No JD pasted</span>}
                  <StatusPill status={job.status} />
                </div>
              </Link>
            ))}
          </Card>
        )}
      </section>
    </>
  );
}
