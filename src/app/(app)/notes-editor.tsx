"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createNote, deleteNote, updateNote } from "@/app/actions";
import type { CoachNote } from "@/lib/types";
import { Card, cn } from "@/lib/ui";

// Notes & actions: titled sections in the application-timeline card format.
// Title = dark bold text; below it a free-text body where lines typed as
// "[] task" (or "[ ] task") become checkable to-dos and "[x] done" renders
// checked. Long bodies collapse to a fading preview behind a triangle.

type Note = Pick<CoachNote, "id" | "title" | "body" | "sort_order">;

const CHECKBOX_RE = /^\[( |x)\]\s?(.*)$/;
const URL_RE = /(https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"])/g;
const LONG_LINES = 6;
const LONG_CHARS = 380;

// Normalize the "[] " typing shortcut to canonical "[ ] " on save.
function normalizeBody(body: string): string {
  return body
    .split("\n")
    .map((line) => line.replace(/^\[\]\s?/, "[ ] "))
    .join("\n");
}

function isLong(body: string): boolean {
  return body.length > LONG_CHARS || body.split("\n").length > LONG_LINES;
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
            className="break-all text-indigo-600 underline underline-offset-2 hover:text-indigo-700"
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
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();
  const fieldRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);
  const idMap = useRef(new Map<string, Promise<string>>());

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

  const persist = (id: string, patch: Partial<{ title: string; body: string }>) =>
    startTransition(async () => {
      await updateNote(await realId(id), patch);
    });

  const setNote = (id: string, patch: Partial<Note>) =>
    setNotes((n) => n.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const addSection = () => {
    const tempId = `tmp-${++tmpCounter}`;
    const sort_order = (notes[notes.length - 1]?.sort_order ?? 0) + 1;
    setNotes((n) => [...n, { id: tempId, title: "", body: "", sort_order }]);
    idMap.current.set(
      tempId,
      createNote({ title: "", body: "", sort_order }).then((res) => res.id ?? tempId)
    );
    setEditing({ id: tempId, field: "title" });
  };

  const removeSection = (id: string) => {
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

  return (
    <div className="space-y-3">
      {notes.length === 0 && (
        <Card className="border-dashed p-6 text-center text-sm text-stone-400 shadow-none">
          Nothing here yet — add a section below, or ask your AI what you
          should be working on.
        </Card>
      )}
      {notes.map((note) => {
        const editingTitle = editing?.id === note.id && editing.field === "title";
        const editingBody = editing?.id === note.id && editing.field === "body";
        const collapsible = !editingBody && isLong(note.body);
        const open = expanded.has(note.id);
        const lines = note.body.split("\n");
        return (
          <Card key={note.id} className="group p-4">
            {/* Title row — dark bold, timeline-card style */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-baseline gap-2">
                {collapsible && (
                  <button
                    onClick={() =>
                      setExpanded((s) => {
                        const next = new Set(s);
                        if (next.has(note.id)) next.delete(note.id);
                        else next.add(note.id);
                        return next;
                      })
                    }
                    className={cn(
                      "w-3 shrink-0 self-center text-center text-[10px] text-stone-400 transition-transform hover:text-stone-600",
                      open && "rotate-90"
                    )}
                    title={open ? "Collapse" : "Expand"}
                  >
                    ▶
                  </button>
                )}
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
                        setEditing({ id: note.id, field: "body" });
                      }
                      if (e.key === "Escape") commit(note, "title");
                    }}
                    placeholder="Section title..."
                    className="w-full bg-transparent font-medium text-stone-900 outline-none placeholder:font-normal placeholder:text-stone-300"
                  />
                ) : (
                  <h3
                    onClick={() => setEditing({ id: note.id, field: "title" })}
                    className="min-w-0 cursor-text font-medium text-stone-900"
                  >
                    {note.title || (
                      <span className="font-normal text-stone-300">Untitled section</span>
                    )}
                  </h3>
                )}
              </div>
              <button
                onClick={() => removeSection(note.id)}
                className="shrink-0 rounded p-1 text-xs text-stone-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                title="Delete section"
              >
                ✕
              </button>
            </div>

            {/* Body — free text; "[ ]"/"[x]" lines are checkboxes */}
            {editingBody ? (
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
                placeholder={'Notes... start a line with "[] " to make it a to-do'}
                className="mt-2 w-full resize-none overflow-hidden bg-transparent text-sm leading-relaxed text-stone-700 outline-none placeholder:text-stone-300"
              />
            ) : (
              <div
                className={cn(
                  "mt-2 cursor-text",
                  collapsible &&
                    !open &&
                    "max-h-[6.8rem] overflow-hidden [mask-image:linear-gradient(to_bottom,black_50%,transparent_100%)]"
                )}
                onClick={() => {
                  setExpanded((s) => new Set(s).add(note.id));
                  setEditing({ id: note.id, field: "body" });
                }}
              >
                {note.body === "" ? (
                  <p className="text-sm text-stone-300">
                    Notes... start a line with &quot;[]&nbsp;&quot; to make it a to-do
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
                                : "border-stone-300 bg-white hover:border-indigo-400"
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
                                : "text-stone-700"
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
                      <p key={i} className="text-sm leading-relaxed whitespace-pre-wrap text-stone-700">
                        <Linkified text={line} />
                      </p>
                    );
                  })
                )}
              </div>
            )}
          </Card>
        );
      })}

      <button
        onClick={addSection}
        className="w-full rounded-xl border border-dashed border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-400 transition-colors hover:border-indigo-400 hover:text-indigo-600"
      >
        + Add section
      </button>
    </div>
  );
}
