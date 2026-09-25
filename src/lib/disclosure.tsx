"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/ui";

// Triangle-toggled disclosure with a fading text preview when collapsed —
// the same visual language as collapsed blocks on the dashboard.
export function Disclosure({
  header,
  preview,
  children,
  defaultOpen = false,
}: {
  header: ReactNode;
  preview?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-stone-200 dark:border-stone-700">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex w-full items-baseline gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-stone-50 dark:hover:bg-stone-700/60"
      >
        <span
          className={cn(
            "w-3 shrink-0 self-center text-center text-[10px] text-stone-400 transition-transform",
            open && "rotate-90"
          )}
        >
          ▶
        </span>
        <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-2">{header}</div>
      </button>
      {!open && preview && (
        <button type="button" aria-label="Expand details"
          onClick={() => setOpen(true)}
          className="-mt-1.5 block w-full text-left cursor-pointer px-3 pb-2.5 pl-8"
        >
          <div className="line-clamp-3 text-sm leading-relaxed whitespace-pre-wrap text-stone-500 dark:text-stone-400">
            {preview}
          </div>
        </button>
      )}
      <div hidden={!open} className="border-t border-stone-100 dark:border-stone-700/60 p-4">{children}</div>
    </div>
  );
}
