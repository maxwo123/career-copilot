import type { ReactNode } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/lib/theme";

export function AuthShell({ title, description, children }: {
  title: string; description: string; children: ReactNode;
}) {
  return (
    <main id="main-content" className="flex min-h-dvh flex-col px-5 py-6 sm:px-8">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between">
        <Link href="/login" className="text-lg font-semibold tracking-tight">CareerCopilot</Link>
        <ThemeToggle />
      </header>
      <div className="mx-auto grid w-full max-w-5xl flex-1 items-center gap-12 py-12 lg:grid-cols-[1fr_26rem] lg:gap-20">
        <section className="hidden lg:block">
          <h2 className="max-w-sm text-5xl leading-[1.12] font-semibold tracking-tight text-balance">Make room for your next move.</h2>
          <p className="mt-6 max-w-sm text-base leading-7 text-stone-600 dark:text-stone-400">Your applications, career notes, and tailored documents. Together in a workspace that keeps you moving.</p>
          <div className="mt-10 border-l-2 border-indigo-500 pl-5 text-sm leading-6 text-stone-600 dark:text-stone-400">Save an opportunity. Shape your story.<br />Know what to do next.</div>
        </section>
        <section className="mx-auto w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8 dark:border-stone-700 dark:bg-stone-800" aria-labelledby="auth-title">
          <h1 id="auth-title" className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-400">{description}</p>
          {children}
        </section>
      </div>
    </main>
  );
}
