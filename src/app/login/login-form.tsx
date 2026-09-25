"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { bootstrapAccount, signIn } from "@/app/auth-actions";
import { AuthShell } from "@/lib/auth-shell";
import { PasswordInput } from "@/lib/password-input";
import { Button, Field, Input } from "@/lib/ui";

export function LoginForm({ passwordUpdated }: { passwordUpdated: boolean }) {
  const [mode, setMode] = useState<"signin" | "create">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <AuthShell title={mode === "signin" ? "Welcome back" : "Set up your workspace"}
      description={mode === "signin" ? "Sign in to pick up where you left off." : "Create the first account for this personal workspace."}>
      {passwordUpdated && <p role="status" className="mt-5 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">Password updated. Sign in with your new password.</p>}
      <form className="mt-6 space-y-5" onSubmit={(event) => {
        event.preventDefault();
        setError("");
        startTransition(async () => {
          try {
            if (mode === "create") {
              const result = await bootstrapAccount(email.trim(), password);
              if (result.error) { setError(result.error); return; }
            }
            const result = await signIn(email.trim(), password);
            if (result.error) setError(result.error);
          } catch { setError("We couldn’t connect. Check your connection and try again."); }
        });
      }}>
        <Field label="Email"><Input name="email" type="email" required autoComplete="email" spellCheck={false} placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" /></Field>
        <div>
          <PasswordInput label="Password" name="password" required minLength={mode === "create" ? 8 : undefined} autoComplete={mode === "create" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} aria-describedby={error ? "login-error" : undefined} />
          {mode === "signin" ? <Link href="/forgot-password" className="mt-1 flex min-h-11 w-fit items-center text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-300 dark:hover:text-indigo-200">Forgot password?</Link> : <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">Use at least 8 characters.</p>}
        </div>
        {error && <p id="login-error" role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
        <Button type="submit" disabled={pending} className="h-11 w-full">{pending ? (mode === "signin" ? "Signing in…" : "Creating account…") : (mode === "signin" ? "Sign in" : "Create account")}</Button>
      </form>
      <div className="mt-6 border-t border-stone-200 pt-4 dark:border-stone-700">
        <button type="button" disabled={pending} onClick={() => { setMode(mode === "signin" ? "create" : "signin"); setError(""); setPassword(""); }} className="min-h-11 w-full rounded-lg text-sm font-medium text-stone-600 hover:text-indigo-600 disabled:opacity-50 dark:text-stone-300 dark:hover:text-indigo-300">{mode === "signin" ? "First time here? Set up your account" : "Already have an account? Sign in"}</button>
      </div>
    </AuthShell>
  );
}
