"use client";

import { useState, useTransition } from "react";
import { bootstrapAccount, signIn } from "@/app/auth-actions";

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
      <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold">Career Copilot</h1>
        <p className="mt-1 text-sm text-stone-500">
          Your job applications, tracked. Your resumes, crafted with Claude.
        </p>

        <form
          className="mt-6 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            submit("signin");
          }}
        >
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
          <input
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          {notice && <p className="text-sm text-green-700">{notice}</p>}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {pending ? "Working..." : "Sign in"}
          </button>
        </form>

        <button
          onClick={() => submit("create")}
          disabled={pending}
          className="mt-3 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-50"
        >
          First time? Create the account
        </button>
      </div>
    </main>
  );
}
