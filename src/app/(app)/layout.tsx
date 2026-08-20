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
      <header className="no-print sticky top-0 z-10 border-b border-stone-200 bg-white/85 backdrop-blur dark:border-stone-700 dark:bg-stone-900/85">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-5 px-4">
          <Link
            href="/"
            className="text-[15px] font-semibold tracking-tight text-stone-900 dark:text-stone-100"
          >
            Career<span className="text-indigo-600 dark:text-indigo-400">Copilot</span>
          </Link>
          <NavLinks />
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Link href="/jobs/new" className={buttonCls("primary", "sm")}>
              + Add job
            </Link>
            <form action={signOut}>
              <Button variant="ghost" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-10">{children}</main>
    </div>
  );
}
