import Link from "next/link";
import { notFound } from "next/navigation";
import { marked } from "marked";
import { createClient } from "@/lib/supabase/server";
import type { DocumentRow, Job } from "@/lib/types";
import { DOC_TYPE_LABELS } from "@/lib/types";
import { Badge, Card, formatDate } from "@/lib/ui";
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
      <div className="no-print mb-6">
        {job && (
          <Link
            href={`/jobs/${job.id}`}
            className="text-xs font-medium text-stone-400 transition-colors hover:text-stone-600 dark:hover:text-stone-300"
          >
            ← {job.title} · {job.company}
          </Link>
        )}
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
              {doc.title || DOC_TYPE_LABELS[doc.doc_type]}
            </h1>
            <div className="mt-1.5 flex items-center gap-2">
              <Badge>{DOC_TYPE_LABELS[doc.doc_type]}</Badge>
              <span className="text-xs text-stone-400 tabular-nums">
                v{doc.version} · {formatDate(doc.created_at)}
              </span>
            </div>
          </div>
          <PrintButton />
        </div>
      </div>

      <Card className="print-sheet p-10 shadow-sm">
        <div
          className="doc-prose"
          // Content is authored by the account owner (directly or via their
          // authenticated Claude session) — single-user trusted input.
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </Card>

      <Card className="no-print mt-6">
        <details>
          <summary className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-medium text-stone-800 dark:text-stone-200 transition-colors hover:bg-stone-50 dark:hover:bg-stone-700/60">
            <span>Raw Markdown</span>
            <span className="text-xs text-stone-300 dark:text-stone-600">▾</span>
          </summary>
          <pre className="max-h-96 overflow-auto border-t border-stone-100 dark:border-stone-700/60 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-stone-600 dark:text-stone-300">
            {doc.content_md}
          </pre>
        </details>
      </Card>
    </div>
  );
}
