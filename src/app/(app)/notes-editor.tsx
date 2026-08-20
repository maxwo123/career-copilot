"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createNote, deleteNote, updateNote } from "@/app/actions";
import type { CoachNote } from "@/lib/types";
import { Card, cn } from "@/lib/ui";

// Notes & actions as a month-grouped timeline (same rail UI as the
// application timeline). Each card: bold title on its own line; underneath,
// AI-generated content behaving like a basic text editor — free text,
// hyperlinks, and "[ ] task" checkbox lines. Cards are collapsed by default
// (title + to-do count + faded two-line preview) and expand to full height.

type Note = Pick<
  CoachNote,
  "id" | "title" | "body" | "scheduled_for" | "sort_order"
>;

const CHECKBOX_RE = /^\[( |x)\]\s?(.*)$/;
const URL_RE = /(https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"])/g;

// Normalize the "[] " typing shortcut to canonical "[ ] " on save.
function normalizeBody(body: string): string {
  return body
    .split("\n")
    .map((line) => line.replace(/^\[\]\s?/, "[ ] "))
    .join("\n");
}

function monthOf(note: Note): string {
  return note.scheduled_for ? note.scheduled_for.slice(0, 7) : "";
}

function monthLabel(month: string): string {
  if (!month) return "Someday";
  const d = new Date(`${month}-01T00:00:00`);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function taskCounts(body: string): { open: number; done: number } {
  return {
    open: (body.match(/^\[ \]/gm) ?? []).length,
    done: (body.match(/^\[x\]/gm) ?? []).length,
  };
}

function Linkified({ text }: { text: string }) {
  const parts = text.split(URL_RE);
  return (
    <>
      {parts.map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="break-all text-indigo-600 dark:text-indigo-400 underline underline-offset-2 hover:text-indigo-700 dark:hover:text-indigo-300"
          >
            {part.replace(/^https?:\/\/(www\.)?/, "")}
          </a>
        ) : (
          part
        )
      )}
    </>
  );
}

let tmpCounter = 0;

export function NotesEditor({ initialNotes }: { initialNotes: Note[] }) {
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [editing, setEditing] = useState<{ id: string; field: "title" | "body" } | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set()); // collapsed by default
  const [, startTransition] = useTransition();
  const fieldRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);
  const idMap = useRef(new Map<string, Promise<string>>());
  const currentMonth = new Date().toISOString().slice(0, 7);

  useEffect(() => {
    const el = fieldRef.current;
    if (!el) return;
    if (el instanceof HTMLTextAreaElement) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
    el.focus();
    const len = el.value.length;
    el.setSelectionRange(len, len);
  }, [editing]);

  const realId = async (id: string) => (await idMap.current.get(id)) ?? id;

  const persist = (
    id: string,
    patch: Partial<{ title: string; body: string; scheduled_for: string | null }>
  ) =>
    startTransition(async () => {
      await updateNote(await realId(id), patch);
    });

  const setNote = (id: string, patch: Partial<Note>) =>
    setNotes((n) => n.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const toggleExpanded = (id: string) =>
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const addNote = () => {
    const tempId = `tmp-${++tmpCounter}`;
    const scheduled_for = `${currentMonth}-01`;
    const sort_order =
      Math.max(0, ...notes.map((n) => n.sort_order)) + 1;
    setNotes((n) => [...n, { id: tempId, title: "", body: "", scheduled_for, sort_order }]);
    idMap.current.set(
      tempId,
      createNote({ title: "", body: "", scheduled_for, sort_order }).then(
        (res) => res.id ?? tempId
      )
    );
    setExpanded((s) => new Set(s).add(tempId));
    setEditing({ id: tempId, field: "title" });
  };

  const removeNote = (id: string) => {
    setNotes((n) => n.filter((x) => x.id !== id));
    startTransition(async () => {
      await deleteNote(await realId(id));
    });
  };

  const commit = (note: Note, field: "title" | "body") => {
    if (field === "body") {
      const body = normalizeBody(note.body);
      if (body !== note.body) setNote(note.id, { body });
      persist(note.id, { body });
    } else {
      persist(note.id, { title: note.title.trim() });
    }
    setEditing(null);
  };

  const toggleLine = (note: Note, lineIndex: number) => {
    const lines = note.body.split("\n");
    const m = lines[lineIndex]?.match(CHECKBOX_RE);
    if (!m) return;
    lines[lineIndex] = `[${m[1] === "x" ? " " : "x"}] ${m[2]}`;
    const body = lines.join("\n");
    setNote(note.id, { body });
    persist(note.id, { body });
  };

  const setMonth = (note: Note, month: string) => {
    const scheduled_for = month ? `${month}-01` : null;
    setNote(note.id, { scheduled_for });
    persist(note.id, { scheduled_for });
  };

  // Group into ordered month buckets; "Someday" (undated) last.
  const sorted = [...notes].sort((a, b) => {
    const ma = monthOf(a) || "9999-12";
    const mb = monthOf(b) || "9999-12";
    if (ma !== mb) return ma < mb ? -1 : 1;
    return a.sort_order - b.sort_order;
  });
  const groups: { month: string; notes: Note[] }[] = [];
  for (const note of sorted) {
    const month = monthOf(note);
    const last = groups[groups.length - 1];
    if (last && last.month === month) last.notes.push(note);
    else groups.push({ month, notes: [note] });
  }

  return (
    <div>
      {notes.length === 0 && (
        <Card className="border-dashed p-6 text-center text-sm text-stone-400 shadow-none">
          Nothing here yet — add an action item below, or ask your AI what you
          should be working on.
        </Card>
      )}

      {groups.length > 0 && (
        <div className="relative space-y-10 before:absolute before:top-1.5 before:bottom-1.5 before:left-[7px] before:w-px before:bg-stone-200">
          {groups.map((group) => {
            const isCurrent = group.month === currentMonth;
            const isPast = group.month !== "" && group.month < currentMonth;
            return (
              <section key={group.month || "someday"} className="relative pl-9">
                <span
                  className={cn(
                    "absolute top-0.5 left-0 size-[15px] rounded-full border-[3px] bg-white dark:bg-stone-800",
                    isCurrent
                      ? "border-indigo-500"
                      : isPast
                        ? "border-stone-200 dark:border-stone-700"
                        : "border-stone-300 dark:border-stone-600"
                  )}
                />
                <h2
                  className={cn(
                    "text-xs font-semibold tracking-wider uppercase",
                    isPast ? "text-stone-400" : "text-stone-600 dark:text-stone-300"
                  )}
                >
                  {monthLabel(group.month)}
                  {isCurrent && (
                    <span className="ml-2 font-medium text-indigo-500 normal-case tracking-normal">
                      · this month
                    </span>
                  )}
                </h2>
                <div className="mt-3 space-y-3">
                  {group.notes.map((note) => {
                    const isOpen = expanded.has(note.id);
                    const editingTitle = editing?.id === note.id && editing.field === "title";
                    const editingBody = editing?.id === note.id && editing.field === "body";
                    const counts = taskCounts(note.body);
                    const lines = note.body.split("\n");
                    return (
                      <Card key={note.id} className="group p-4">
                        {/* Title row — always bold, own line */}
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            <button
                              onClick={() => toggleExpanded(note.id)}
                              className={cn(
                                "w-3 shrink-0 text-center text-[10px] text-stone-400 transition-transform hover:text-stone-600 dark:hover:text-stone-300",
                                isOpen && "rotate-90"
                              )}
                              title={isOpen ? "Collapse" : "Expand"}
                            >
                              ▶
                            </button>
                            {editingTitle ? (
                              <input
                                ref={(el) => {
                                  fieldRef.current = el;
                                }}
                                value={note.title}
                                onChange={(e) => setNote(note.id, { title: e.target.value })}
                                onBlur={() => commit(note, "title")}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    persist(note.id, { title: note.title.trim() });
                                    setExpanded((s) => new Set(s).add(note.id));
                                    setEditing({ id: note.id, field: "body" });
                                  }
                                  if (e.key === "Escape") commit(note, "title");
                                }}
                                placeholder="Action item title..."
                                className="w-full bg-transparent font-semibold text-stone-900 dark:text-stone-100 outline-none placeholder:font-normal placeholder:text-stone-300"
                              />
                            ) : (
                              <h3
                                onClick={() =>
                                  isOpen
                                    ? setEditing({ id: note.id, field: "title" })
                                    : toggleExpanded(note.id)
                                }
                                className="min-w-0 cursor-pointer truncate font-semibold text-stone-900 dark:text-stone-100"
                                title={isOpen ? "Click to rename" : "Click to expand"}
                              >
                                {note.title || (
                                  <span className="font-normal text-stone-300 dark:text-stone-600">
                                    Untitled action item
                                  </span>
                                )}
                              </h3>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {(counts.open > 0 || counts.done > 0) && (
                              <span className="text-xs text-stone-400 tabular-nums">
                                {counts.open > 0 && `${counts.open} to-do${counts.open === 1 ? "" : "s"}`}
                                {counts.open > 0 && counts.done > 0 && " · "}
                                {counts.done > 0 && `${counts.done} done`}
                              </span>
                            )}
                            <button
                              onClick={() => removeNote(note.id)}
                              className="rounded p-1 text-xs text-stone-300 dark:text-stone-600 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                              title="Delete"
                            >
                              ✕
                            </button>
                          </div>
                        </div>

                        {/* Collapsed: faded two-line preview */}
                        {!isOpen && note.body !== "" && (
                          <div
                            onClick={() => toggleExpanded(note.id)}
                            className="mt-1.5 max-h-[2.9rem] cursor-pointer overflow-hidden pl-5 text-sm leading-relaxed whitespace-pre-wrap text-stone-500 dark:text-stone-400 [mask-image:linear-gradient(to_bottom,black_30%,transparent_100%)]"
                          >
                            {note.body.replace(/^\[( |x)\]\s?/gm, "☐ ")}
                          </div>
                        )}

                        {/* Expanded: full text-editor body */}
                        {isOpen &&
                          (editingBody ? (
                            <textarea
                              ref={(el) => {
                                fieldRef.current = el;
                              }}
                              value={note.body}
                              rows={2}
                              onChange={(e) => {
                                setNote(note.id, { body: e.target.value });
                                e.target.style.height = "auto";
                                e.target.style.height = `${e.target.scrollHeight}px`;
                              }}
                              onBlur={() => commit(note, "body")}
                              onKeyDown={(e) => {
                                if (e.key === "Escape") commit(note, "body");
                              }}
                              placeholder={'Notes, links, explanations... start a line with "[] " to make it a to-do'}
                              className="mt-2 ml-5 w-[calc(100%-1.25rem)] resize-none overflow-hidden bg-transparent text-sm leading-relaxed text-stone-700 dark:text-stone-300 outline-none placeholder:text-stone-300"
                            />
                          ) : (
                            <div
                              className="mt-2 cursor-text pl-5"
                              onClick={() => setEditing({ id: note.id, field: "body" })}
                            >
                              {note.body === "" ? (
                                <p className="text-sm text-stone-300 dark:text-stone-600">
                                  Notes, links, explanations... start a line with
                                  &quot;[]&nbsp;&quot; to make it a to-do
                                </p>
                              ) : (
                                lines.map((line, i) => {
                                  const m = line.match(CHECKBOX_RE);
                                  if (m) {
                                    const checked = m[1] === "x";
                                    return (
                                      <div key={i} className="flex items-start gap-2 py-0.5">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleLine(note, i);
                                          }}
                                          className={cn(
                                            "mt-[3px] flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                                            checked
                                              ? "border-indigo-600 bg-indigo-600 text-white"
                                              : "border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 hover:border-indigo-400"
                                          )}
                                          title={checked ? "Uncheck" : "Mark done"}
                                        >
                                          {checked && (
                                            <span className="text-[10px] leading-none">✓</span>
                                          )}
                                        </button>
                                        <span
                                          className={cn(
                                            "min-w-0 text-sm leading-relaxed",
                                            checked
                                              ? "text-stone-400 line-through decoration-stone-300"
                                              : "text-stone-700 dark:text-stone-300"
                                          )}
                                        >
                                          <Linkified text={m[2]} />
                                        </span>
                                      </div>
                                    );
                                  }
                                  return line === "" ? (
                                    <div key={i} className="h-2.5" />
                                  ) : (
                                    <p
                                      key={i}
                                      className="text-sm leading-relaxed whitespace-pre-wrap text-stone-700 dark:text-stone-300"
                                    >
                                      <Linkified text={line} />
                                    </p>
                                  );
                                })
                              )}
                            </div>
                          ))}

                        {/* Expanded footer: month picker */}
                        {isOpen && (
                          <div className="mt-3 flex items-center gap-2 pl-5">
                            <label className="flex items-center gap-1.5 text-xs text-stone-400">
                              <span>Month</span>
                              <input
                                type="month"
                                value={monthOf(note)}
                                onChange={(e) => setMonth(note, e.target.value)}
                                className="rounded-md border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 px-1.5 py-0.5 text-xs text-stone-600 dark:text-stone-300 outline-none focus:border-indigo-400"
                              />
                            </label>
                            {monthOf(note) && (
                              <button
                                onClick={() => setMonth(note, "")}
                                className="text-xs text-stone-300 dark:text-stone-600 transition-colors hover:text-stone-500 dark:hover:text-stone-400"
                                title="Move to Someday"
                              >
                                clear
                              </button>
                            )}
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <button
        onClick={addNote}
        className="mt-6 w-full rounded-xl border border-dashed border-stone-300 dark:border-stone-600 px-4 py-2.5 text-sm font-medium text-stone-400 transition-colors hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400"
      >
        + Add action item
      </button>
    </div>
  );
}
