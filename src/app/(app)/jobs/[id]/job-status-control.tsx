"use client";

import { useState, useTransition } from "react";
import { updateJobStatus } from "@/app/actions";
import type { JobStatus } from "@/lib/types";
import { StatusSelect } from "@/lib/ui";

export function JobStatusControl({ jobId, initialStatus }: { jobId: string; initialStatus: JobStatus }) {
  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function changeStatus(nextStatus: JobStatus) {
    const previousStatus = status;
    setStatus(nextStatus);
    setError("");
    const data = new FormData();
    data.set("status", nextStatus);
    startTransition(async () => {
      try {
        const result = await updateJobStatus(jobId, data);
        if (result.error) {
          setStatus(previousStatus);
          setError(result.error);
          return;
        }
      } catch {
        setStatus(previousStatus);
        setError("Couldn’t update status. Try again.");
      }
    });
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <StatusSelect
        aria-label="Job status"
        value={status}
        disabled={pending}
        onChange={(event) => changeStatus(event.target.value as JobStatus)}
      />
      {pending && <span role="status" className="text-xs text-stone-500 dark:text-stone-400">Saving…</span>}
      {error && <span role="alert" className="max-w-40 text-right text-xs text-red-700 dark:text-red-300">{error}</span>}
    </div>
  );
}
