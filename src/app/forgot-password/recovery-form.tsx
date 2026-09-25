"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { requestPasswordReset } from "@/app/auth-actions";
import { Button, Field, Input } from "@/lib/ui";

export function RecoveryForm({ invalidLink }: { invalidLink: boolean }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(invalidLink ? "This reset link is invalid or expired. Request a new link and open it in the same browser." : "");
  const [pending, startTransition] = useTransition();

  return (
    <div className="mt-6">
      {sent ? (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
          <p className="font-semibold">Check your inbox</p>
          <p className="mt-1 break-words">If an account exists for {email}, you’ll receive a reset link. Check your spam folder too.</p>
          <p className="mt-2">Open the link in this browser to continue.</p>
          <button type="button" onClick={() => { setSent(false); setError(""); }} className="mt-3 min-h-11 font-medium underline underline-offset-4">Use a different email or try again</button>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={(event) => {
          event.preventDefault();
          setError("");
          startTransition(async () => {
            try {
              const result = await requestPasswordReset(email);
              if (result.error) setError(result.error);
              else setSent(true);
            } catch {
              setError("We couldn’t connect. Check your connection and try again.");
            }
          });
        }}>
          <Field label="Email">
            <Input name="email" type="email" autoComplete="email" spellCheck={false} required className="h-11" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-describedby={error ? "recovery-error" : undefined} />
          </Field>
          {error && <p id="recovery-error" role="alert" className="text-sm leading-6 text-red-700 dark:text-red-300">{error}</p>}
          <Button type="submit" disabled={pending} className="h-11 w-full">{pending ? "Sending reset link…" : "Send reset link"}</Button>
        </form>
      )}
      <Link href="/login" className="mt-5 flex min-h-11 items-center justify-center text-sm font-medium text-stone-600 hover:text-indigo-600 dark:text-stone-300 dark:hover:text-indigo-300">Back to sign in</Link>
    </div>
  );
}
