import { createClient } from "@/lib/supabase/server";
import type { Activity, CoachNote } from "@/lib/types";
import { Card, SectionTitle, cn, formatDate } from "@/lib/ui";
import { NotesEditor } from "./notes-editor";

// Coach home: the AI-composed notes/to-dos document plus the activity feed.
// Everything job-application related lives on /applications.
export default async function Dashboard() {
  const supabase = await createClient();
  const [{ data: noteRows }, { data: activityRows }] = await Promise.all([
    supabase
      .from("coach_notes")
      .select("id, title, body, sort_order")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("activity")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);
  const notes = (noteRows ?? []) as CoachNote[];
  const activity = (activityRows ?? []) as Activity[];

  const openTasks = notes.reduce(
    (sum, n) => sum + (n.body.match(/^\[ \]/gm)?.length ?? 0),
    0
  );

  return (
    <div className="space-y-10">
      <section>
        <SectionTitle count={openTasks}>Notes &amp; actions</SectionTitle>
        <div className="mt-3">
          <NotesEditor initialNotes={notes} />
        </div>
      </section>

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
