"use client";

import { useState } from "react";
import Link from "next/link";
import type { Job, JobStatus, JobType } from "@/lib/types";
import { JOB_TYPES, JOB_TYPE_LABELS } from "@/lib/types";
import { matchesJobSearch, matchesJobType } from "@/lib/job-search";
import { Card, Field, Input, SectionTitle, StatusSelect, StatusPill, buttonCls, formatDate } from "@/lib/ui";

type JobTypeFilter = JobType | "unspecified" | "";

export function JobList({ jobs, initialQuery, initialStatus, initialJobType }: {
  jobs: Job[];
  initialQuery: string;
  initialStatus: JobStatus | "";
  initialJobType: JobTypeFilter;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState<JobStatus | "">(initialStatus);
  const [jobType, setJobType] = useState<JobTypeFilter>(initialJobType);
  const matchingJobs = jobs.filter((job) =>
    (!status || job.status === status) &&
    matchesJobType(job, jobType) &&
    matchesJobSearch(job, query)
  );

  function updateFilters(nextQuery: string, nextStatus: JobStatus | "", nextJobType: JobTypeFilter) {
    setQuery(nextQuery);
    setStatus(nextStatus);
    setJobType(nextJobType);
    const params = new URLSearchParams();
    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    if (nextStatus) params.set("status", nextStatus);
    if (nextJobType) params.set("type", nextJobType);
    window.history.replaceState(null, "", `/applications${params.size ? `?${params}` : ""}`);
  }

  const returnTo = `/applications${query.trim() || status || jobType ? `?${new URLSearchParams({ view: "jobs", ...(query.trim() ? { q: query.trim() } : {}), ...(status ? { status } : {}), ...(jobType ? { type: jobType } : {}) })}` : ""}`;

  return (
    <>
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
              onChange={(event) => updateFilters(event.target.value, status, jobType)}
              placeholder="Search role, company, or location…"
              autoComplete="off"
            />
          </Field>
          <StatusSelect
            includeAll
            name="status"
            aria-label="Filter by status"
            value={status}
            onChange={(event) => updateFilters(query, event.target.value as JobStatus | "", jobType)}
          />
          <label className="flex flex-col gap-1.5 text-xs font-medium text-stone-700 dark:text-stone-300">
            Job type
            <select
              name="type"
              value={jobType}
              onChange={(event) => updateFilters(query, status, event.target.value as JobTypeFilter)}
              className="h-8 w-36 rounded-lg border border-stone-300 bg-white px-2 text-xs text-stone-700 focus:outline-2 focus:outline-offset-1 focus:outline-indigo-600 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
            >
              <option value="">All types</option>
              {JOB_TYPES.map((type) => <option key={type} value={type}>{JOB_TYPE_LABELS[type]}</option>)}
              <option value="unspecified">Not specified</option>
            </select>
          </label>
          {(query || status || jobType) && <button type="button" onClick={() => updateFilters("", "", "")} className={buttonCls("ghost")}>Clear filters</button>}
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
            <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">Try another search or filter, or show all jobs.</p>
            <button type="button" onClick={() => updateFilters("", "", "")} className={buttonCls("secondary", "md", "mt-4")}>Show all jobs</button>
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
                  {job.job_type && <span>{JOB_TYPE_LABELS[job.job_type]}</span>}
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
