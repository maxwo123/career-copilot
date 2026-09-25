import { applicationReturn } from "@/lib/mutation";
import { CopyButton } from "@/lib/copy-button";
import { ActionForm } from "@/lib/action-form";
import Link from "next/link";
import { DeleteButton } from "@/lib/delete-button";
import { notFound } from "next/navigation";
import {
  deleteDocument,
  deleteJob,
  updateJobDetails,
  updateJobStatus,
} from "@/app/actions";
import { createClient } from "@/lib/supabase/server";
import type { DocumentRow, Job } from "@/lib/types";
import { DOC_TYPE_LABELS, JOB_STATUSES } from "@/lib/types";
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  STATUS_LABELS,
  SectionTitle,
  Select,
  StatusPill,
  Textarea,
  formatDate,
} from "@/lib/ui";

const summaryCls =
  "flex cursor-pointer items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-medium text-stone-800 dark:text-stone-200 transition-colors hover:bg-stone-50 dark:hover:bg-stone-700/60";

export default async function JobPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string; edit?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const returnTo = applicationReturn(query.returnTo);
  const supabase = await createClient();

  const [{ data: jobRow }, { data: docRows, error: documentsError }] = await Promise.all([
    supabase.from("jobs").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("documents")
      .select("id, job_id, doc_type, title, version, created_at, content_md")
      .eq("job_id", id)
      .order("created_at", { ascending: false }),
  ]);
  if (!jobRow) notFound();
  const job = jobRow as Job;
  const documents = (docRows ?? []) as DocumentRow[];

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Header */}
      <div>
        <Link
          href={returnTo}
          className="text-xs font-medium text-stone-500 dark:text-stone-400 transition-colors hover:text-stone-600 dark:hover:text-stone-300"
        >
          ← Applications
        </Link>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
              {job.title}
            </h1>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
              {job.company}
              {job.location ? ` · ${job.location}` : ""}
              {job.source ? ` · via ${job.source}` : ""}
            </p>
            {job.url && (
              <a
                href={job.url}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block text-sm font-medium text-indigo-600 dark:text-indigo-400 underline underline-offset-2 hover:text-indigo-700 dark:hover:text-indigo-300"
              >
                View posting ↗
              </a>
            )}
          </div>
          <StatusPill status={job.status} />
        </div>
      </div>

      {/* Status + key dates */}
      <Card className="p-4">
        <ActionForm
          action={updateJobStatus.bind(null, job.id)}
          className="flex flex-wrap items-end gap-3"
        >
          <Field label="Status" className="w-44">
            <Select name="status" defaultValue={job.status}>
              {JOB_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          </Field>
          <Button>Update</Button>
          <div className="ml-auto grid grid-cols-[auto_auto] gap-x-2 gap-y-0.5 text-xs">
            {job.deadline && (
              <>
                <span className="text-right text-stone-500 dark:text-stone-400">Deadline</span>
                <span className="text-stone-600 dark:text-stone-300 tabular-nums">
                  {formatDate(job.deadline)}
                </span>
              </>
            )}
            {job.applied_at && (
              <>
                <span className="text-right text-stone-500 dark:text-stone-400">Applied</span>
                <span className="text-stone-600 dark:text-stone-300 tabular-nums">
                  {formatDate(job.applied_at)}
                </span>
              </>
            )}
            <span className="text-right text-stone-500 dark:text-stone-400">Added</span>
            <span className="text-stone-600 dark:text-stone-300 tabular-nums">
              {formatDate(job.created_at)}
            </span>
          </div>
        </ActionForm>
      </Card>

      {/* Documents */}
      <section>
        <SectionTitle count={documents.length}>Documents</SectionTitle>
        {documentsError ? <p role="alert" className="mt-3 text-red-700 dark:text-red-300">Documents couldn’t load. Refresh to try again.</p> : documents.length === 0 ? (
          <Card className="mt-3 border-dashed border-indigo-200 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/30 p-4 text-sm leading-relaxed text-stone-600 dark:text-stone-300 shadow-none">
            <p className="font-medium text-stone-800 dark:text-stone-200">
              No tailored documents yet.
            </p>
            <p className="mt-2">Ask your connected assistant to tailor a resume using your profile and this job description. The saved document will appear here.</p>
            <div className="mt-3"><CopyButton text={`Tailor a resume for ${job.title} at ${job.company} in Career Copilot (job ID: ${job.id}). Use my master profile and the saved job description. Save the result to this job.`} /></div>
          </Card>
        ) : (
          <Card className="mt-3 divide-y divide-stone-100 dark:divide-stone-700/60">
            {documents.map((d) => (
              <div
                key={d.id}
                className="flex flex-wrap items-center gap-3 px-4 py-2.5"
              >
                <Badge>{DOC_TYPE_LABELS[d.doc_type]}</Badge>
                <Link
                  href={`/documents/${d.id}?${new URLSearchParams({ returnTo: `/jobs/${job.id}?${new URLSearchParams({ returnTo })}` })}`}
                  className="min-w-0 flex-1 basis-40 break-words text-sm font-medium text-stone-900 dark:text-stone-100 hover:text-indigo-700 dark:hover:text-indigo-300"
                >
                  {d.title || `${DOC_TYPE_LABELS[d.doc_type]} v${d.version}`}
                  <span className="ml-1.5 text-xs font-normal text-stone-500 dark:text-stone-400 tabular-nums">
                    v{d.version}
                  </span>
                </Link>
                <span className="text-xs text-stone-500 dark:text-stone-400 tabular-nums">
                  {formatDate(d.created_at)}
                </span>
                <ActionForm action={deleteDocument.bind(null, d.id, job.id)}>
                  <DeleteButton label="Delete document" message="Delete this document? This cannot be undone." />
                </ActionForm>
              </div>
            ))}
          </Card>
        )}
      </section>

      {/* Job description */}
      {job.jd_text ? <Card>
        <details>
          <summary className={summaryCls}>
            <span>
              Job description{" "}
              {job.jd_text ? (
                <span className="font-normal text-stone-500 dark:text-stone-400 tabular-nums">
                  · {job.jd_text.length.toLocaleString()} chars
                </span>
              ) : (
                <span className="font-normal text-amber-600 dark:text-amber-500">
                  — add the description in the editor below.
                </span>
              )}
            </span>
            <span className="text-xs text-stone-300 dark:text-stone-600">▾</span>
          </summary>
          {job.jd_text ? (
            <div className="border-t border-stone-100 dark:border-stone-700/60 p-4">
              <pre tabIndex={0} className="max-h-96 overflow-auto font-mono text-xs leading-relaxed whitespace-pre-wrap text-stone-600 dark:text-stone-300">
                {job.jd_text}
              </pre>
            </div>
          ) : null}
        </details>
      </Card> : <a href="#job-editor" className="block rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">Add the missing job description in the editor below →</a>}

      {/* Edit details */}
      <Card>
        <details id="job-editor" open={!job.jd_text || query.edit === "description"}>
          <summary className={summaryCls}>
            <span>Edit details &amp; notes</span>
            <span className="text-xs text-stone-300 dark:text-stone-600">▾</span>
          </summary>
          <ActionForm
            cancel action={updateJobDetails.bind(null, job.id)}
            className="space-y-4 border-t border-stone-100 dark:border-stone-700/60 p-4"
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Posting URL">
                <Input name="url" defaultValue={job.url} />
              </Field>
              <Field label="Source">
                <Input name="source" defaultValue={job.source} />
              </Field>
              <Field label="Location">
                <Input name="location" defaultValue={job.location} />
              </Field>
            </div>
            <Field label="Deadline" className="sm:w-56">
              <Input name="deadline" type="date" defaultValue={job.deadline ?? ""} />
            </Field>
            <Field label="Job description">
              <Textarea
                name="jd_text"
                rows={10}
                defaultValue={job.jd_text}
                className="text-sm leading-6"
              />
            </Field>
            <Field label="Notes">
              <Textarea name="notes" rows={3} defaultValue={job.notes} />
            </Field>
            <Button>Save changes</Button>
          </ActionForm>
        </details>
      </Card>

      {job.notes && (
        <section>
          <SectionTitle>Notes</SectionTitle>
          <Card className="mt-3 p-4">
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-stone-700 dark:text-stone-300">
              {job.notes}
            </p>
          </Card>
        </section>
      )}

      <ActionForm action={deleteJob.bind(null, job.id)} className="pt-2">
        <input type="hidden" name="returnTo" value={returnTo} />
        <DeleteButton label="Delete this job and all its documents" message="Delete this job and all its documents? This cannot be undone." />
      </ActionForm>
    </div>
  );
}
