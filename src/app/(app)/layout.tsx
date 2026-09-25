import Link from "next/link";
import { signOut } from "@/app/auth-actions";
import { ThemeToggle } from "@/lib/theme";
import { Button, buttonCls } from "@/lib/ui";
import { NavLinks } from "./nav";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen">
      <a href="#main-content" className="no-print sr-only fixed top-2 left-2 z-50 rounded-lg bg-indigo-600 px-4 py-3 text-white focus:not-sr-only">Skip to content</a>
      <header className="no-print sticky top-0 z-10 border-b border-stone-200 bg-white/85 backdrop-blur dark:border-stone-700 dark:bg-stone-900/85">
        <div className="mx-auto flex min-h-16 max-w-5xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 lg:gap-x-5">
          <Link
            href="/"
            className="shrink-0 text-[15px] font-semibold tracking-tight text-stone-900 dark:text-stone-100"
          >
            Career<span className="text-indigo-600 dark:text-indigo-400">Copilot</span>
          </Link>
          <NavLinks />
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <Link href="/jobs/new" className={buttonCls("primary", "sm", "min-h-10")}>
              + Add job
            </Link>
            <form action={signOut}>
              <Button variant="ghost" size="sm" className="min-h-10">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-5xl px-4 py-7 sm:py-10">{children}</main>
    </div>
  );
}
