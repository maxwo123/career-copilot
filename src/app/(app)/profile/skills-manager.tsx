"use client";

import { useState, useTransition } from "react";
import {
  addSkillCategory,
  deleteProfileEntry,
  setSkillList,
} from "@/app/actions";
import type { ProfileEntry } from "@/lib/types";
import { Button, Card, Input, SectionTitle } from "@/lib/ui";

// Split a stored skill list on commas that are OUTSIDE parentheses, so
// "Python (pandas, NumPy), SQL" → ["Python (pandas, NumPy)", "SQL"].
export function splitSkills(description: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of description) {
    if (ch === "(") depth++;
    if (ch === ")") depth = Math.max(0, depth - 1);
    if (ch === "," && depth === 0) {
      out.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) out.push(current.trim());
  return out.filter(Boolean);
}

function SkillCategory({ entry }: { entry: ProfileEntry }) {
  const [skills, setSkills] = useState(() => splitSkills(entry.description));
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();

  const persist = (next: string[]) => {
    setSkills(next);
    startTransition(async () => {
      await setSkillList(entry.id, next);
    });
  };

  const addDraft = () => {
    const value = draft.trim();
    if (!value) {
      setAdding(false);
      return;
    }
    if (!skills.some((s) => s.toLowerCase() === value.toLowerCase())) {
      persist([...skills, value]);
    }
    setDraft("");
    // stay in adding mode so several skills can be entered in a row
  };

  const remove = (skill: string) => persist(skills.filter((s) => s !== skill));

  return (
    <div className="rounded-lg border border-stone-200 p-3.5">
      <div className="flex items-baseline gap-2">
        <h3 className="text-sm font-semibold text-stone-900">
          {entry.title || "(untitled)"}
        </h3>
        <span className="text-xs text-stone-400 tabular-nums">
          {skills.length} skill{skills.length === 1 ? "" : "s"}
          {pending ? " · saving..." : ""}
        </span>
        <button
          onClick={() => {
            if (
              skills.length === 0 ||
              confirm(
                `Delete the "${entry.title}" category and its ${skills.length} skills?`
              )
            ) {
              startTransition(async () => {
                await deleteProfileEntry(entry.id);
              });
            }
          }}
          className="ml-auto text-xs font-medium text-stone-300 transition-colors hover:text-red-500"
          title="Delete category"
        >
          Delete
        </button>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {skills.map((skill) => (
          <span
            key={skill}
            className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 py-1 pr-1.5 pl-2.5 text-xs font-medium text-indigo-800"
          >
            {skill}
            <button
              onClick={() => remove(skill)}
              className="rounded-full px-0.5 text-indigo-300 transition-colors hover:text-red-500"
              title={`Remove ${skill}`}
            >
              ×
            </button>
          </span>
        ))}

        {adding ? (
          <span className="inline-flex items-center gap-1.5">
            <Input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addDraft();
                }
                if (e.key === "Escape") {
                  setDraft("");
                  setAdding(false);
                }
              }}
              onBlur={() => {
                if (draft.trim()) addDraft();
                else setAdding(false);
              }}
              placeholder="Type a skill, press Enter"
              className="h-7 w-44 rounded-full text-xs"
            />
            <button
              onMouseDown={(e) => e.preventDefault()} // don't blur the input
              onClick={addDraft}
              className="h-7 rounded-full bg-indigo-600 px-2.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-500"
            >
              Add
            </button>
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setDraft("");
                setAdding(false);
              }}
              className="px-1 text-xs font-medium text-stone-400 transition-colors hover:text-stone-600"
            >
              Done
            </button>
          </span>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="inline-flex h-[26px] items-center rounded-full border border-dashed border-stone-300 px-2.5 text-xs font-medium text-stone-500 transition-colors hover:border-indigo-400 hover:text-indigo-600"
          >
            + Add skill
          </button>
        )}
      </div>
    </div>
  );
}

export function SkillsManager({ entries }: { entries: ProfileEntry[] }) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const createCategory = () => {
    const value = name.trim();
    if (!value) {
      setCreating(false);
      return;
    }
    setError("");
    startTransition(async () => {
      const res = await addSkillCategory(value);
      if (res.error) setError(res.error);
      else {
        setName("");
        setCreating(false);
      }
    });
  };

  return (
    <Card className="p-5">
      <SectionTitle
        count={entries.length}
        action={
          !creating && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCreating(true)}
            >
              + New category
            </Button>
          )
        }
      >
        Skills
      </SectionTitle>

      {creating && (
        <div className="mt-4 flex items-center gap-2">
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                createCategory();
              }
              if (e.key === "Escape") setCreating(false);
            }}
            placeholder='Category name, e.g. "Web Development"'
            className="w-64"
          />
          <Button size="md" onClick={createCategory} disabled={pending}>
            Create
          </Button>
          <Button variant="ghost" size="md" onClick={() => setCreating(false)}>
            Cancel
          </Button>
          {error && <span className="text-xs text-red-600">{error}</span>}
        </div>
      )}

      <div className="mt-4 space-y-3">
        {entries.length === 0 && !creating && (
          <p className="text-sm text-stone-400">
            No skill categories yet — create one to start adding skills.
          </p>
        )}
        {entries.map((entry) => (
          <SkillCategory key={entry.id} entry={entry} />
        ))}
      </div>
    </Card>
  );
}
