"use client";
export function SaveStatus({ status, error, retry }: { status: string; error?: string; retry: () => void }) {
  return <div role={status === "error" ? "alert" : "status"} className={`flex flex-wrap items-center gap-2 text-xs ${status === "error" ? "text-red-700 dark:text-red-300" : "text-stone-600 dark:text-stone-400"}`}>
    <span>{status === "saving" ? "Saving…" : status === "saved" ? "Saved" : status === "error" ? error : ""}</span>
    {status === "error" && <button type="button" className="min-h-9 font-medium underline underline-offset-4" onClick={retry}>Retry save</button>}
  </div>;
}
