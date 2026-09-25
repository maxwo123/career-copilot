import { calendarDaysUntil } from "@/lib/mutation";
import { DOC_TYPE_LABELS, type DocumentRow, type Job } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import type { Activity, CoachNote } from "@/lib/types";
import { Card, PageHeader, SectionTitle, buttonCls, cn, formatDate } from "@/lib/ui";
import { NotesEditor } from "./notes-editor";

export default async function Dashboard() {
  const supabase = await createClient();
  const [{ data: noteRows, error: notesError }, { data: activityRows, error: activityError }, { data: profile, error: profileError }, { data: jobRows, error: jobsError }, { data: documentRows, error: documentsError }] = await Promise.all([
    supabase
      .from("coach_notes")
      .select("id, title, body, scheduled_for, sort_order")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("activity")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase.from("profile").select("full_name, summary").maybeSingle(),
    supabase.from("jobs").select("id, title, company, deadline, status").eq("status", "saved").not("deadline", "is", null).order("deadline").limit(5),
    supabase.from("documents").select("id, title, doc_type, version, created_at").order("created_at", { ascending: false }).limit(5),
  ]);
  const notes = (noteRows ?? []) as CoachNote[];
  const activity = (activityRows ?? []) as Activity[];

  const openTasks = notes.reduce(
    (sum, n) => sum + (n.body.match(/^\[ \]/gm)?.length ?? 0),
    0
  );

  return (
    <div className="space-y-10">
      <PageHeader title="Your next steps" description="Keep your career plans and action items in view."
        actions={<Link href="/applications" className={buttonCls("secondary")}>View applications</Link>} />
      {(notesError || activityError || profileError || jobsError || documentsError) && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">Some of your workspace couldn’t load. Refresh the page to try again.</p>}
      {!profileError && (!profile?.full_name || !profile?.summary) && <section className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-5 sm:p-6 dark:border-indigo-900 dark:bg-indigo-950/20">
        <h2 className="text-lg font-semibold">Start with your story</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-stone-600 dark:text-stone-400">Add your experience to your profile, save a job you’re interested in, then connect your AI assistant to help plan your next steps.</p>
        <div className="mt-4 flex flex-wrap gap-3"><Link href="/profile" className={buttonCls()}>Build your profile</Link><Link href="/guide/connect" className={buttonCls("secondary")}>Connect your assistant</Link></div>
      </section>}
      <div className="grid gap-6 md:grid-cols-2">
        <section><SectionTitle>Application deadlines</SectionTitle><Card className="mt-3 divide-y divide-stone-200 dark:divide-stone-700">
          {(jobRows as Job[] | null)?.map((job) => { const days = calendarDaysUntil(job.deadline!); return <Link key={job.id} href={`/jobs/${job.id}`} className="block p-4 hover:bg-stone-50 dark:hover:bg-stone-700/50"><p className="font-medium">{job.title}</p><p className="mt-1 text-sm text-stone-600 dark:text-stone-400">{job.company} · {formatDate(job.deadline)}</p><p className={`mt-1 text-xs font-medium ${days < 0 ? "text-red-700 dark:text-red-300" : "text-stone-600 dark:text-stone-400"}`}>{days < 0 ? `${Math.abs(days)} days overdue` : days === 0 ? "Due today" : `${days} days left`}</p></Link>; })}
          {!jobRows?.length && <p className="p-4 text-sm text-stone-600 dark:text-stone-400">{jobsError ? "Deadlines couldn’t load." : "No saved applications with deadlines. Add a deadline to a tracked job to see it here."}</p>}
        </Card><Link href="/applications" className="mt-3 inline-block text-sm font-medium text-indigo-700 dark:text-indigo-300">View applications →</Link></section>
        <section><SectionTitle>Latest documents</SectionTitle><Card className="mt-3 divide-y divide-stone-200 dark:divide-stone-700">
          {(documentRows as DocumentRow[] | null)?.map((doc) => <Link key={doc.id} href={`/documents/${doc.id}`} className="block p-4 hover:bg-stone-50 dark:hover:bg-stone-700/50"><p className="font-medium">{doc.title || DOC_TYPE_LABELS[doc.doc_type]}</p><p className="mt-1 text-xs text-stone-600 dark:text-stone-400">{DOC_TYPE_LABELS[doc.doc_type]} · v{doc.version} · {formatDate(doc.created_at)}</p></Link>)}
          {!documentRows?.length && <p className="p-4 text-sm text-stone-600 dark:text-stone-400">{documentsError ? "Documents couldn’t load." : "Documents saved by your connected assistant will appear here."}</p>}
        </Card><Link href="/documents" className="mt-3 inline-block text-sm font-medium text-indigo-700 dark:text-indigo-300">Browse documents →</Link></section>
      </div>
      <section>
        <SectionTitle count={openTasks}>Notes &amp; actions</SectionTitle>
        <div className="mt-3">
          <NotesEditor initialNotes={notes} />
        </div>
      </section>

      {activity.length > 0 && (
        <section>
          <SectionTitle>Recent activity</SectionTitle>
          <Card className="mt-3 divide-y divide-stone-100 dark:divide-stone-700/60">
            {activity.map((a) => (
              <div
                key={a.id}
                className="flex items-start gap-2.5 px-4 py-2.5 text-sm text-stone-600 dark:text-stone-300"
              >
                <span
                  className={cn(
                    "mt-1.5 size-1.5 shrink-0 rounded-full",
                    a.actor === "claude" ? "bg-indigo-500" : "bg-stone-300"
                  )}
                  title={a.actor === "claude" ? "Claude" : "You"}
                />
                <span className="min-w-0 flex-1">{a.detail || a.action}</span>
                <span className="shrink-0 text-xs text-stone-500 dark:text-stone-400 tabular-nums">
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
import Link from "next/link";
