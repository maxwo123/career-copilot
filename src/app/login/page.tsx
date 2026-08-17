"use client";

import { useState, useTransition } from "react";
import { bootstrapAccount, signIn } from "@/app/auth-actions";
import { Button, Field, Input } from "@/lib/ui";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = (mode: "signin" | "create") => {
    setError("");
    setNotice("");
    if (!email || !password) {
      setError("Email and password are both required.");
      return;
    }
    startTransition(async () => {
      if (mode === "signin") {
        const res = await signIn(email, password);
        if (res?.error) setError(res.error);
      } else {
        const res = await bootstrapAccount(email, password);
        if (res?.error) setError(res.error);
        else {
          setNotice("Account created — signing you in...");
          const login = await signIn(email, password);
          if (login?.error) setError(login.error);
        }
      }
    });
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-semibold tracking-tight text-stone-900">
            Career<span className="text-indigo-600">Copilot</span>
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-stone-500">
            Your job applications, tracked. Your resumes, crafted with Claude.
          </p>

          <form
            className="mt-7 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              submit("signin");
            }}
          >
            <Field label="Email">
              <Input
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="Password">
              <Input
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            {notice && (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {notice}
              </p>
            )}
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Working..." : "Sign in"}
            </Button>
          </form>

          <Button
            variant="secondary"
            onClick={() => submit("create")}
            disabled={pending}
            className="mt-3 w-full"
          >
            First time? Create the account
          </Button>
        </div>
      </div>
    </main>
  );
}
