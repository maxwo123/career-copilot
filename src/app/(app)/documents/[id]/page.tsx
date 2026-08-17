import Link from "next/link";
import { notFound } from "next/navigation";
import { marked } from "marked";
import { createClient } from "@/lib/supabase/server";
import type { DocumentRow, Job } from "@/lib/types";
import { DOC_TYPE_LABELS } from "@/lib/types";
import { formatDate } from "@/lib/ui";
import { PrintButton } from "./print-button";

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: docRow } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!docRow) notFound();
  const doc = docRow as DocumentRow;

  let job: Job | null = null;
  if (doc.job_id) {
    const { data } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", doc.job_id)
      .maybeSingle();
    job = data as Job | null;
  }

  const html = marked.parse(doc.content_md, { async: false }) as string;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="no-print mb-4 flex flex-wrap items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
              {DOC_TYPE_LABELS[doc.doc_type]} · v{doc.version}
            </span>
            <span className="text-xs text-stone-400">
              {formatDate(doc.created_at)}
            </span>
          </div>
          <h1 className="mt-1 text-lg font-bold">
            {doc.title || DOC_TYPE_LABELS[doc.doc_type]}
          </h1>
          {job && (
            <Link
              href={`/jobs/${job.id}`}
              className="text-sm text-indigo-600 underline"
            >
              ← {job.title} @ {job.company}
            </Link>
          )}
        </div>
        <div className="ml-auto">
          <PrintButton />
        </div>
      </div>

      <div className="print-sheet rounded-xl border border-stone-200 bg-white p-10 shadow-sm">
        <div
          className="doc-prose"
          // Content is authored by the account owner (directly or via their
          // authenticated Claude session) — single-user trusted input.
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>

      <details className="no-print mt-4 rounded-xl border border-stone-200 bg-white">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">
          Raw Markdown
        </summary>
        <pre className="max-h-96 overflow-auto whitespace-pre-wrap border-t border-stone-100 p-4 text-xs text-stone-600">
          {doc.content_md}
        </pre>
      </details>
    </div>
  );
}
