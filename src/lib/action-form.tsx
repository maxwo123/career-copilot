"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { MutationResult } from "@/lib/mutation";
import { Button } from "@/lib/ui";
import { useUnsavedChanges } from "@/lib/use-unsaved-changes";

export function ActionForm({ action, children, className, cancel = false, resetOnSuccess = false, label }: {
  action: (data: FormData) => Promise<MutationResult | void>;
  children: ReactNode;
  className?: string;
  cancel?: boolean;
  resetOnSuccess?: boolean;
  label?: string;
}) {
  const form = useRef<HTMLFormElement>(null);
  const baseline = useRef<Map<string, string>>(new Map());
  const [dirty, setDirty] = useState(false);
  const [result, setResult] = useState<MutationResult>({});
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  useUnsavedChanges(dirty);
  useEffect(() => {
    if (form.current) baseline.current = new Map(Array.from(new FormData(form.current), ([k, v]) => [k, String(v)]));
  }, []);
  return (
    <form ref={form} aria-label={label} onChange={() => { setDirty(true); setResult({}); }} onSubmit={(event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      startTransition(async () => {
        try {
          const response = await action(data) ?? {};
          setResult(response);
          if (response.error || response.fieldErrors) {
            const field = Object.keys(response.fieldErrors ?? {})[0];
            if (field) (form.current?.elements.namedItem(field) as HTMLElement | null)?.focus();
            return;
          }
          setDirty(false);
          if (resetOnSuccess) form.current?.reset();
          else baseline.current = new Map(Array.from(data, ([k, v]) => [k, String(v)]));
          setResult({ ...response, message: response.message ?? "Saved." });
          if (response.redirectTo) router.push(response.redirectTo);
          else router.refresh();
        } catch {
          setResult({ error: "Couldn’t save your changes. Your draft is still here. Please try again." });
        }
      });
    }}>
      <fieldset disabled={pending} className={className}>{children}</fieldset>
      {(cancel || pending || result.error || result.message || dirty) && <div className="mt-3 flex flex-wrap items-center gap-3">
        {cancel && <Button type="button" variant="ghost" size="sm" disabled={pending || !dirty} onClick={() => {
          for (const element of Array.from(form.current?.elements ?? [])) {
            if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
              element.value = baseline.current.get(element.name) ?? ("defaultValue" in element ? element.defaultValue : "");
            }
          }
          setDirty(false); setResult({});
        }}>Cancel changes</Button>}
        <p role={result.error ? "alert" : "status"} className={`text-sm ${result.error ? "text-red-700 dark:text-red-300" : "text-stone-600 dark:text-stone-400"}`}>
          {pending ? "Saving…" : result.error ?? result.message ?? (dirty ? "Unsaved changes" : "")}
        </p>
      </div>}
      {result.fieldErrors && <ul role="alert" className="mt-2 text-sm text-red-700 dark:text-red-300">{Object.entries(result.fieldErrors).map(([name, message]) => <li key={name}>{message}</li>)}</ul>}
    </form>
  );
}
