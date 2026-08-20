"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/ui";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/applications", label: "Applications" },
  { href: "/profile", label: "Profile" },
  { href: "/guide", label: "Getting started" },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1">
      {LINKS.map((link) => {
        const active =
          link.href === "/"
            ? pathname === "/"
            : link.href === "/applications"
              ? pathname.startsWith("/applications") ||
                pathname.startsWith("/jobs") ||
                pathname.startsWith("/documents")
              : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-stone-100 text-stone-900"
                : "text-stone-500 hover:text-stone-900"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
