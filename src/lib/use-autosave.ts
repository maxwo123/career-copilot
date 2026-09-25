"use client";
import { useRef, useState } from "react";
import { createSerialSave } from "@/lib/serial-save";
import { useUnsavedChanges } from "@/lib/use-unsaved-changes";

export function useAutosave<T>(save: (value: T) => Promise<{ error?: string } | void>) {
  const queue = useRef(createSerialSave());
  const revision = useRef(0);
  const latest = useRef<{ value: T } | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");
  useUnsavedChanges(status === "saving" || status === "error");
  const persist = (value: T) => {
    latest.current = { value };
    const version = ++revision.current;
    setStatus("saving"); setError("");
    void queue.current(async () => {
      try {
        const response = await save(value);
        if (response?.error) throw new Error(response.error);
        if (version === revision.current) setStatus("saved");
      } catch {
        if (version === revision.current) { setStatus("error"); setError("Changes couldn’t be saved. Your draft is still here."); }
      }
    });
  };
  return { persist, status, error, retry: () => { if (latest.current) persist(latest.current.value); } };
}
