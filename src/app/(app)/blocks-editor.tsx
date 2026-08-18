"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent,
} from "react";
import { createBlock, deleteBlock, updateBlock } from "@/app/actions";
import type { BlockKind, CoachBlock } from "@/lib/types";
import { cn } from "@/lib/ui";

// Notion-lite block document: text notes and checkable tasks interleave.
// Enter = new block below (splits at the caret) · Shift+Enter = newline
// inside the block · Backspace on an empty block = delete it · typing "[] "
// converts a text block to a task. Long text blocks collapse to a fading
// preview with a triangle toggle.

type Block = Pick<CoachBlock, "id" | "kind" | "content" | "checked" | "sort_order">;

const LONG_CHARS = 200;
const LONG_LINES = 3;
const URL_RE = /(https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"])/g;

function isLong(content: string): boolean {
  return (
    content.length > LONG_CHARS || content.split("\n").length > LONG_LINES
  );
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

export function BlocksEditor({ initialBlocks }: { initialBlocks: Block[] }) {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();
  const caretRef = useRef<{ id: string; pos: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  // Temp-id → real-id promises so saves on brand-new blocks wait for the insert.
  const idMap = useRef(new Map<string, Promise<string>>());

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
    const want = caretRef.current;
    const pos = want && want.id === editingId ? want.pos : ta.value.length;
    ta.focus();
    ta.setSelectionRange(pos, pos);
    caretRef.current = null;
  }, [editingId]);

  const realId = async (id: string) => (await idMap.current.get(id)) ?? id;

  const persistUpdate = (
    id: string,
    patch: Partial<{ kind: BlockKind; content: string; checked: boolean }>
  ) =>
    startTransition(async () => {
      await updateBlock(await realId(id), patch);
    });

  const insertAfter = (index: number, kind: BlockKind, content: string): string => {
    const tempId = `tmp-${++tmpCounter}`;
    const prev = blocks[index];
    const next = blocks[index + 1];
    const sort_order = prev
      ? next
        ? (prev.sort_order + next.sort_order) / 2
        : prev.sort_order + 1
      : (next ? next.sort_order - 1 : 1);
    const block: Block = { id: tempId, kind, content, checked: false, sort_order };
    setBlocks((b) => [...b.slice(0, index + 1), block, ...b.slice(index + 1)]);
    // Keep the temp id in client state (stable React keys, no caret-losing
    // remounts); persistence resolves it to the real id via idMap.
    idMap.current.set(
      tempId,
      createBlock({ kind, content, sort_order }).then((res) => res.id ?? tempId)
    );
    return tempId;
  };

  const removeBlock = (id: string) => {
    setBlocks((b) => b.filter((x) => x.id !== id));
    startTransition(async () => {
      await deleteBlock(await realId(id));
    });
  };

  const setContent = (id: string, content: string) => {
    // "[] " at the start of a text block converts it to a task, Notion-style.
    const block = blocks.find((b) => b.id === id);
    if (block?.kind === "text" && /^\[\]\s/.test(content)) {
      const stripped = content.replace(/^\[\]\s/, "");
      setBlocks((b) =>
        b.map((x) => (x.id === id ? { ...x, kind: "task", content: stripped } : x))
      );
      return;
    }
    setBlocks((b) => b.map((x) => (x.id === id ? { ...x, content } : x)));
  };

  const commit = (id: string) => {
    const block = blocks.find((b) => b.id === id);
    if (block) persistUpdate(id, { kind: block.kind, content: block.content });
    setEditingId(null);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>, index: number) => {
    const block = blocks[index];
    const ta = e.currentTarget;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const pos = ta.selectionStart;
      const before = block.content.slice(0, pos);
      const after = block.content.slice(pos);
      setBlocks((b) => b.map((x) => (x.id === block.id ? { ...x, content: before } : x)));
      persistUpdate(block.id, { kind: block.kind, content: before });
      const newId = insertAfter(index, block.kind, after);
      caretRef.current = { id: newId, pos: 0 };
      setEditingId(newId);
    } else if (e.key === "Backspace" && block.content === "") {
      e.preventDefault();
      removeBlock(block.id);
      const prev = blocks[index - 1];
      if (prev) {
        caretRef.current = { id: prev.id, pos: prev.content.length };
        setEditingId(prev.id);
      } else {
        setEditingId(null);
      }
    } else if (e.key === "Escape") {
      commit(block.id);
    }
  };

  const toggleKind = (block: Block) => {
    const kind: BlockKind = block.kind === "task" ? "text" : "task";
    setBlocks((b) =>
      b.map((x) => (x.id === block.id ? { ...x, kind, checked: false } : x))
    );
    persistUpdate(block.id, { kind, checked: false });
  };

  const toggleChecked = (block: Block) => {
    setBlocks((b) =>
      b.map((x) => (x.id === block.id ? { ...x, checked: !x.checked } : x))
    );
    persistUpdate(block.id, { checked: !block.checked });
  };

  const addAtEnd = (kind: BlockKind) => {
    const id = insertAfter(blocks.length - 1, kind, "");
    caretRef.current = { id, pos: 0 };
    setEditingId(id);
  };

  return (
    <div className="py-1">
      {blocks.length === 0 && (
        <p className="px-4 py-3 text-sm text-stone-400">
          Nothing here yet — add a note below, or ask your AI what you should
          be working on.
        </p>
      )}
      {blocks.map((block, index) => {
        const editing = editingId === block.id;
        const collapsible =
          block.kind === "text" && !editing && isLong(block.content);
        const open = expanded.has(block.id);
        return (
          <div
            key={block.id}
            className="group flex items-start gap-2 rounded-lg px-3 py-1 hover:bg-stone-50/80"
          >
            {/* Leading control: checkbox, or triangle for collapsible text */}
            {block.kind === "task" ? (
              <button
                onClick={() => toggleChecked(block)}
                className={cn(
                  "mt-[5px] flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                  block.checked
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-stone-300 bg-white hover:border-indigo-400"
                )}
                title={block.checked ? "Uncheck" : "Mark done"}
              >
                {block.checked && <span className="text-[10px] leading-none">✓</span>}
              </button>
            ) : collapsible ? (
              <button
                onClick={() =>
                  setExpanded((s) => {
                    const next = new Set(s);
                    if (next.has(block.id)) next.delete(block.id);
                    else next.add(block.id);
                    return next;
                  })
                }
                className={cn(
                  "mt-[5px] w-4 shrink-0 text-center text-[10px] text-stone-400 transition-transform hover:text-stone-600",
                  open && "rotate-90"
                )}
                title={open ? "Collapse" : "Expand"}
              >
                ▶
              </button>
            ) : (
              <span className="mt-[5px] w-4 shrink-0" />
            )}

            {/* Content: read view ⇄ textarea */}
            <div className="min-w-0 flex-1">
              {editing ? (
                <textarea
                  ref={textareaRef}
                  value={block.content}
                  rows={1}
                  onChange={(e) => {
                    setContent(block.id, e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = `${e.target.scrollHeight}px`;
                  }}
                  onKeyDown={(e) => onKeyDown(e, index)}
                  onBlur={() => commit(block.id)}
                  placeholder={block.kind === "task" ? "Task..." : "Note..."}
                  className="w-full resize-none overflow-hidden bg-transparent text-sm leading-relaxed text-stone-800 outline-none placeholder:text-stone-300"
                />
              ) : (
                <div
                  onClick={() => setEditingId(block.id)}
                  className={cn(
                    "cursor-text text-sm leading-relaxed whitespace-pre-wrap",
                    block.kind === "task" && block.checked
                      ? "text-stone-400 line-through decoration-stone-300"
                      : "text-stone-800",
                    collapsible &&
                      !open &&
                      "max-h-[3.9rem] overflow-hidden [mask-image:linear-gradient(to_bottom,black_40%,transparent_100%)]"
                  )}
                >
                  {block.content ? (
                    <Linkified text={block.content} />
                  ) : (
                    <span className="text-stone-300">Empty block</span>
                  )}
                </div>
              )}
            </div>

            {/* Hover controls */}
            <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={() => toggleKind(block)}
                className="rounded p-1 text-xs text-stone-300 hover:bg-stone-100 hover:text-stone-500"
                title={block.kind === "task" ? "Convert to note" : "Convert to task"}
              >
                {block.kind === "task" ? "¶" : "☑"}
              </button>
              <button
                onClick={() => removeBlock(block.id)}
                className="rounded p-1 text-xs text-stone-300 hover:bg-stone-100 hover:text-red-500"
                title="Delete block"
              >
                ✕
              </button>
            </div>
          </div>
        );
      })}

      {/* Ghost add row */}
      <div className="mt-1 flex items-center gap-3 px-3 pb-1 opacity-60 transition-opacity hover:opacity-100">
        <button
          onClick={() => addAtEnd("text")}
          className="text-xs font-medium text-stone-400 hover:text-indigo-600"
        >
          + Note
        </button>
        <button
          onClick={() => addAtEnd("task")}
          className="text-xs font-medium text-stone-400 hover:text-indigo-600"
        >
          + Task
        </button>
        <span className="ml-auto hidden text-[11px] text-stone-300 sm:block">
          Enter: new block · Shift+Enter: new line · &quot;[]&nbsp;&quot;: task
        </span>
      </div>
    </div>
  );
}
