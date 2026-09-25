"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/ui";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/applications", label: "Applications" },
  { href: "/documents", label: "Documents" },
  { href: "/profile", label: "Profile" },
  { href: "/guide", label: "Getting started" },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main navigation" className="order-last flex w-full items-center gap-1 overflow-x-auto lg:order-none lg:w-auto">
      {LINKS.map((link) => {
        const active =
          link.href === "/"
            ? pathname === "/"
            : link.href === "/applications"
              ? pathname.startsWith("/applications") ||
                pathname.startsWith("/jobs")
              : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              link.href === "/guide" && "ml-auto border-l border-stone-200 dark:border-stone-700",
              "flex min-h-11 shrink-0 items-center rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                : "text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
