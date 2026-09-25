"use client";

import { useState, useTransition } from "react";
import { updatePassword } from "@/app/auth-actions";
import { Button } from "@/lib/ui";
import { PasswordInput } from "@/lib/password-input";

export function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <form className="mt-6 space-y-4" onSubmit={(event) => {
      event.preventDefault();
      setError("");
      if (password !== confirmation) { setError("Your passwords don’t match. Enter them again."); return; }
      startTransition(async () => {
        try {
          const result = await updatePassword(password, confirmation);
          if (result.error) setError(result.error);
        } catch { setError("We couldn’t save your password. Check your connection and try again."); }
      });
    }}>
      <PasswordInput label="New password" name="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
      <PasswordInput label="Confirm new password" name="confirmation" autoComplete="new-password" required minLength={8} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} aria-describedby={error ? "password-error" : undefined} />
      {error && <p id="password-error" role="alert" className="text-sm leading-6 text-red-700 dark:text-red-300">{error}</p>}
      <Button type="submit" disabled={pending} className="h-11 w-full">{pending ? "Saving password…" : "Save new password"}</Button>
      <a href="/forgot-password" className="flex min-h-11 items-center justify-center text-sm text-stone-600 underline underline-offset-4 dark:text-stone-300">Need a new reset link?</a>
    </form>
  );
}
