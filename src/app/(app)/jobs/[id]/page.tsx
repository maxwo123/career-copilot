import Link from "next/link";
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
import { STATUS_LABELS, StatusPill, formatDate } from "@/lib/ui";

const inputCls =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500";

export default async function JobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: jobRow }, { data: docRows }] = await Promise.all([
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
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{job.title}</h1>
          <p className="text-stone-500">
            {job.company}
            {job.location ? ` · ${job.location}` : ""}
            {job.source ? ` · via ${job.source}` : ""}
          </p>
          {job.url && (
            <a
              href={job.url}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-indigo-600 underline"
            >
              View posting ↗
            </a>
          )}
        </div>
        <StatusPill status={job.status} />
      </div>

      {/* Status + key dates */}
      <section className="rounded-xl border border-stone-200 bg-white p-4">
        <form
          action={updateJobStatus.bind(null, job.id)}
          className="flex flex-wrap items-end gap-3"
        >
          <label className="block text-sm">
            <span className="font-medium">Status</span>
            <select
              name="status"
              defaultValue={job.status}
              className={`mt-1 ${inputCls}`}
            >
              {JOB_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          <button className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
            Update
          </button>
          <div className="ml-auto space-y-0.5 text-right text-xs text-stone-400">
            {job.deadline && <div>Deadline: {formatDate(job.deadline)}</div>}
            {job.applied_at && <div>Applied: {formatDate(job.applied_at)}</div>}
            <div>Added: {formatDate(job.created_at)}</div>
          </div>
        </form>
      </section>

      {/* Documents */}
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">
          Documents ({documents.length})
        </h2>
        {documents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50/50 p-4 text-sm text-stone-600">
            <p className="font-medium text-stone-800">
              No tailored documents yet.
            </p>
            <p className="mt-1">
              Open Claude Code and say something like:{" "}
              <code className="rounded bg-white px-1.5 py-0.5 text-xs">
                Tailor a resume for the {job.company} job in Career Copilot
              </code>{" "}
              — Claude reads this job&apos;s description and your profile via
              MCP, then saves the result here.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {documents.map((d) => (
              <li
                key={d.id}
                className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-3"
              >
                <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                  {DOC_TYPE_LABELS[d.doc_type]}
                </span>
                <Link
                  href={`/documents/${d.id}`}
                  className="font-medium hover:text-indigo-700"
                >
                  {d.title || `${DOC_TYPE_LABELS[d.doc_type]} v${d.version}`}
                </Link>
                <span className="text-xs text-stone-400">v{d.version}</span>
                <span className="ml-auto text-xs text-stone-400">
                  {formatDate(d.created_at)}
                </span>
                <form action={deleteDocument.bind(null, d.id, job.id)}>
                  <button
                    className="text-xs text-stone-300 hover:text-red-500"
                    title="Delete document"
                  >
                    ✕
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Job description */}
      <details className="rounded-xl border border-stone-200 bg-white" open={!job.jd_text}>
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">
          Job description{" "}
          {job.jd_text ? (
            <span className="font-normal text-stone-400">
              ({job.jd_text.length.toLocaleString()} chars)
            </span>
          ) : (
            <span className="font-normal text-amber-600">
              — missing! Paste it below so Claude can tailor documents.
            </span>
          )}
        </summary>
        <div className="border-t border-stone-100 p-4">
          {job.jd_text ? (
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap text-xs text-stone-600">
              {job.jd_text}
            </pre>
          ) : null}
        </div>
      </details>

      {/* Edit details */}
      <details className="rounded-xl border border-stone-200 bg-white">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">
          Edit details & notes
        </summary>
        <form
          action={updateJobDetails.bind(null, job.id)}
          className="space-y-3 border-t border-stone-100 p-4"
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-sm">
              <span className="font-medium">Posting URL</span>
              <input name="url" defaultValue={job.url} className={`mt-1 ${inputCls}`} />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Source</span>
              <input name="source" defaultValue={job.source} className={`mt-1 ${inputCls}`} />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Location</span>
              <input name="location" defaultValue={job.location} className={`mt-1 ${inputCls}`} />
            </label>
          </div>
          <label className="block text-sm">
            <span className="font-medium">Deadline</span>
            <input
              name="deadline"
              type="date"
              defaultValue={job.deadline ?? ""}
              className={`mt-1 ${inputCls}`}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Job description</span>
            <textarea
              name="jd_text"
              rows={10}
              defaultValue={job.jd_text}
              className={`mt-1 ${inputCls} font-mono text-xs`}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Notes</span>
            <textarea
              name="notes"
              rows={3}
              defaultValue={job.notes}
              className={`mt-1 ${inputCls}`}
            />
          </label>
          <button className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
            Save changes
          </button>
        </form>
      </details>

      {job.notes && (
        <section className="rounded-xl border border-stone-200 bg-white p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
            Notes
          </h2>
          <p className="mt-1 whitespace-pre-wrap text-sm text-stone-700">
            {job.notes}
          </p>
        </section>
      )}

      <form action={deleteJob.bind(null, job.id)} className="pt-2">
        <button className="text-xs text-stone-400 hover:text-red-600">
          Delete this job and all its documents
        </button>
      </form>
    </div>
  );
}
