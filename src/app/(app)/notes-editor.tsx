"use client";

import { useState, useTransition } from "react";
import { createNote, deleteNote, updateNote } from "@/app/actions";
import type { CoachNote } from "@/lib/types";
import { Button, Card, Field, Input, Textarea } from "@/lib/ui";
import { useAutosave } from "@/lib/use-autosave";
import { useUnsavedChanges } from "@/lib/use-unsaved-changes";
import { SaveStatus } from "@/lib/save-status";

type Note = Pick<CoachNote, "id" | "title" | "body" | "scheduled_for" | "sort_order">;
const taskPattern = /^\[( |x)\]\s?(.*)$/;
function normalize(body: string) { return body.replace(/^\[\]\s?/gm, "[ ] "); }
function counts(body: string) { return { open: (body.match(/^\[ \]/gm) ?? []).length, done: (body.match(/^\[x\]/gm) ?? []).length }; }
function monthLabel(value: string) { return value ? new Date(`${value}-01T12:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "Someday"; }
function LinkedText({ text }: { text: string }) {
  return <>{text.split(/(https?:\/\/[^\s<>]+)/g).map((part, index) => /^https?:\/\//.test(part) ? <a key={index} href={part} target="_blank" rel="noreferrer" className="break-all text-indigo-700 underline dark:text-indigo-300">{part}</a> : part)}</>;
}

function NoteCard({ initial, onDeleted, currentMonth }: { initial: Note; onDeleted: (id: string) => void; currentMonth: string }) {
  const [note, setNote] = useState(initial);
  const [source, setSource] = useState(initial);
  const [editing, setEditing] = useState(!initial.title);
  const [dirty, setDirty] = useState(false);
  const [expanded, setExpanded] = useState(initial.scheduled_for?.slice(0, 7) === currentMonth && counts(initial.body).open > 0);
  const [deleteError, setDeleteError] = useState("");
  const [pending, startTransition] = useTransition();
  const autosave = useAutosave<Note>((value) => updateNote(value.id, { title: value.title, body: normalize(value.body), scheduled_for: value.scheduled_for }));
  useUnsavedChanges(dirty);
  // Apply refreshed server content only when there is no local draft or pending write.
  if (source !== initial) {
    setSource(initial);
    if (!dirty && autosave.status !== "saving" && autosave.status !== "error") setNote(initial);
  }
  const persist = (next: Note) => { const value = { ...next, body: normalize(next.body) }; setNote(value); setDirty(false); autosave.persist(value); };
  const totals = counts(note.body);
  return <Card className="p-4 sm:p-5">
    <div className="flex items-start justify-between gap-3">
      <button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)} className="min-w-0 flex-1 text-left">
        <h3 className="font-semibold break-words">{note.title || "Untitled note"}</h3>
        <p className="mt-1 text-xs text-stone-600 dark:text-stone-400">{totals.open} open actions · {totals.done} completed · {expanded ? "Collapse" : "Expand"}</p>
      </button>
      <Button type="button" variant="ghost" size="sm" onClick={() => { setExpanded(true); setEditing(!editing); }}> {editing ? "Done editing" : "Edit"}</Button>
    </div>
    {!expanded && <p className="mt-3 line-clamp-2 text-sm text-stone-600 dark:text-stone-400">{note.body.replace(/^\[( |x)\]\s?/gm, "")}</p>}
    {(expanded || editing) && <div className="mt-4 space-y-4">
      {editing ? <div className="space-y-3" onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) persist(note);
      }}>
        <Field label="Title"><Input value={note.title} onChange={(event) => { setNote({ ...note, title: event.target.value }); setDirty(true); }} /></Field>
        <Field label="Notes and actions" hint="[ ] starts an action item"><Textarea rows={6} value={note.body} onChange={(event) => { setNote({ ...note, body: event.target.value }); setDirty(true); }} /></Field>
        <p className="text-xs text-stone-600 dark:text-stone-400">Saves when you leave the editor.</p>
      </div> : <div className="space-y-2 text-sm leading-6 whitespace-pre-wrap break-words">{note.body.split("\n").map((line, index) => {
        const task = line.match(taskPattern);
        if (!task) return <p key={index}><LinkedText text={line || " "} /></p>;
        return <div key={index} className="flex items-start gap-2"><input type="checkbox" aria-label={task[2] || "Action item"} checked={task[1] === "x"} className="mt-1 size-5 accent-indigo-600" onChange={() => {
          const lines = note.body.split("\n"); lines[index] = `[${task[1] === "x" ? " " : "x"}] ${task[2]}`;
          persist({ ...note, body: lines.join("\n") });
        }} /><span className={task[1] === "x" ? "text-stone-500 line-through dark:text-stone-400" : ""}><LinkedText text={task[2]} /></span></div>;
      })}</div>}
      <div className="flex flex-wrap items-end justify-between gap-3 border-t border-stone-200 pt-3 dark:border-stone-700">
        <Field label="Target month"><Input type="month" value={note.scheduled_for?.slice(0, 7) ?? ""} onChange={(event) => persist({ ...note, scheduled_for: event.target.value ? `${event.target.value}-01` : null })} /></Field>
        <Button type="button" variant="danger" size="sm" disabled={pending || autosave.status === "saving"} onClick={() => {
          if (!confirm("Delete this note and its action items? This cannot be undone.")) return;
          startTransition(async () => {
            try { const result = await deleteNote(note.id); if (result.error) setDeleteError(result.error); else onDeleted(note.id); }
            catch { setDeleteError("Couldn’t delete the note. Try again."); }
          });
        }}>{pending ? "Deleting…" : "Delete note"}</Button>
      </div>
    </div>}
    <div className="mt-3"><SaveStatus {...autosave} /></div>
    {deleteError && <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-300">{deleteError}</p>}
  </Card>;
}

export function NotesEditor({ initialNotes }: { initialNotes: Note[] }) {
  const [created, setCreated] = useState<Note[]>([]);
  const [deleted, setDeleted] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const notes = [...initialNotes, ...created.filter((note) => !initialNotes.some((item) => item.id === note.id))].filter((note) => !deleted.includes(note.id));
  const sections = [
    { title: "Current and overdue", notes: notes.filter((note) => counts(note.body).open > 0 && !!note.scheduled_for && note.scheduled_for.slice(0, 7) <= currentMonth) },
    { title: "Upcoming and reference notes", notes: notes.filter((note) => !(counts(note.body).open > 0 && !!note.scheduled_for && note.scheduled_for.slice(0, 7) <= currentMonth)) },
  ];
  return <div className="space-y-6">
    {sections.flatMap((section) => section.notes.sort((a, b) => (a.scheduled_for ?? "9999").localeCompare(b.scheduled_for ?? "9999") || a.sort_order - b.sort_order).map((note, index) => <div key={note.id}>
      {index === 0 && <h3 className="mb-3 text-sm font-medium text-stone-600 dark:text-stone-400">{section.title}</h3>}
      <p className="mb-2 text-xs text-stone-600 dark:text-stone-400">{monthLabel(note.scheduled_for?.slice(0, 7) ?? "")}</p><NoteCard initial={note} currentMonth={currentMonth} onDeleted={(id) => setDeleted((ids) => [...ids, id])} />
    </div>))}
    {!notes.length && <p className="rounded-xl border border-dashed border-stone-300 p-6 text-sm text-stone-600 dark:border-stone-600 dark:text-stone-400">Add a note or ask your connected assistant to plan your next steps.</p>}
    <Button type="button" variant="secondary" disabled={pending} onClick={() => {
      setError(""); startTransition(async () => {
        const values = { title: "", body: "", scheduled_for: `${currentMonth}-01`, sort_order: Math.max(0, ...notes.map((note) => note.sort_order)) + 1 };
        try { const result = await createNote(values); if (result.error || !result.id) setError(result.error ?? "Couldn’t create a note."); else setCreated((items) => [...items, { ...values, id: result.id! }]); }
        catch { setError("Couldn’t create a note. Try again."); }
      });
    }}>{pending ? "Creating…" : "Add note"}</Button>
    {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
  </div>;
}
