"use client";
import { useState } from "react";
import { Button } from "@/lib/ui";
export function CopyButton({ text, label = "Copy prompt" }: { text: string; label?: string }) {
  const [status, setStatus] = useState("");
  return <span className="inline-flex flex-wrap items-center gap-2"><Button type="button" variant="secondary" size="sm" onClick={async () => {
    try { await navigator.clipboard.writeText(text); setStatus("Copied."); } catch { setStatus("Copy unavailable. Select and copy the text instead."); }
  }}>{label}</Button><span role="status" className="text-xs text-stone-600 dark:text-stone-300">{status}</span></span>;
}
