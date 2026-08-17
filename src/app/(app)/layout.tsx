import Link from "next/link";
import { signOut } from "@/app/auth-actions";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen">
      <header className="no-print sticky top-0 z-10 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
          <Link href="/" className="text-sm font-bold tracking-tight">
            Career<span className="text-indigo-600">Copilot</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm text-stone-600">
            <Link href="/" className="hover:text-stone-900">
              Dashboard
            </Link>
            <Link href="/profile" className="hover:text-stone-900">
              Profile
            </Link>
            <Link
              href="/jobs/new"
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
            >
              + Add job
            </Link>
          </nav>
          <form action={signOut} className="ml-auto">
            <button className="text-xs text-stone-400 hover:text-stone-600">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
