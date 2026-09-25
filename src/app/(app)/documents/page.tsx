import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DOC_TYPE_LABELS, type DocumentRow, type Job, type DocType } from "@/lib/types";
import { Badge, Button, Card, Field, Input, PageHeader, Select, buttonCls, formatDate } from "@/lib/ui";

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<{ q?: string; type?: string; job?: string }> }) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const type = Object.hasOwn(DOC_TYPE_LABELS, params.type ?? "") ? params.type as DocType : "";
  const jobId = typeof params.job === "string" ? params.job : "";
  const supabase = await createClient();
  const [{ data: rows, error }, { data: jobRows, error: jobsError }] = await Promise.all([
    supabase.from("documents").select("id, job_id, doc_type, title, version, created_at").order("created_at", { ascending: false }),
    supabase.from("jobs").select("id, title, company").order("company"),
  ]);
  const jobs = (jobRows ?? []) as Pick<Job, "id" | "title" | "company">[];
  const documents = ((rows ?? []) as DocumentRow[]).filter((doc) => (!type || doc.doc_type === type) && (!jobId || (jobId === "standalone" ? !doc.job_id : doc.job_id === jobId)) && (doc.title || DOC_TYPE_LABELS[doc.doc_type]).toLowerCase().includes(query.toLowerCase()));
  const returnTo = `/documents?${new URLSearchParams({ ...(query ? { q: query } : {}), ...(type ? { type } : {}), ...(jobId ? { job: jobId } : {}) })}`;
  return <div className="space-y-6">
    <PageHeader title="Documents" description="Your resumes, cover letters, interview prep, and career briefings. Newest first." />
    <form action="/documents" role="search" className="flex flex-wrap items-end gap-3">
      <Field label="Search documents" className="min-w-0 grow basis-56"><Input name="q" type="search" defaultValue={query} placeholder="Search by title…" /></Field>
      <Field label="Document type"><Select name="type" defaultValue={type}><option value="">All types</option>{Object.entries(DOC_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></Field>
      <Field label="Related job" className="min-w-0 grow basis-56"><Select name="job" defaultValue={jobId}><option value="">All jobs and standalone</option><option value="standalone">Standalone documents</option>{jobs.map((job) => <option key={job.id} value={job.id}>{job.title} · {job.company}</option>)}</Select></Field>
      <Button>Search</Button>
      {(query || type || jobId) && <Link href="/documents" className={buttonCls("ghost")}>Clear filters</Link>}
    </form>
    {(error || jobsError) && <p role="alert" className="text-red-700 dark:text-red-300">Some documents or job details couldn’t load. Refresh to try again.</p>}
    {!error && <p role="status" className="text-sm text-stone-600 dark:text-stone-400">{documents.length} {documents.length === 1 ? "document" : "documents"}</p>}
    {!error && documents.length === 0 ? <Card className="border-dashed p-8 text-center"><h2 className="font-semibold">{query || type || jobId ? "No matching documents" : "Your documents will appear here"}</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-stone-600 dark:text-stone-400">{query || type || jobId ? "Change or clear the filters to see more documents." : "Ask your connected assistant to create a document from your profile, tailor it to a saved job, or save a standalone career briefing."}</p><Link href={query || type || jobId ? "/documents" : "/guide/connect"} className={buttonCls("secondary", "md", "mt-4")}>{query || type || jobId ? "Show all documents" : "Connect your assistant"}</Link></Card> : <div className="space-y-3">{documents.map((doc) => {
      const job = jobs.find((item) => item.id === doc.job_id);
      return <Link key={doc.id} href={`/documents/${doc.id}?${new URLSearchParams({ returnTo })}`} className="block rounded-xl border border-stone-200 bg-white p-4 transition hover:border-indigo-400 dark:border-stone-700 dark:bg-stone-800"><div className="flex flex-wrap items-start justify-between gap-2"><h2 className="min-w-0 break-words font-semibold">{doc.title || DOC_TYPE_LABELS[doc.doc_type]}</h2><Badge>{DOC_TYPE_LABELS[doc.doc_type]}</Badge></div><p className="mt-2 text-sm text-stone-600 dark:text-stone-400">{job ? `${job.title} · ${job.company}` : doc.job_id ? "Linked job" : "Standalone document"}</p><p className="mt-2 text-xs text-stone-600 dark:text-stone-400">Version {doc.version} · {formatDate(doc.created_at)}</p></Link>;
    })}</div>}
  </div>;
}
