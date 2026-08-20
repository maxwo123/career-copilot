"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/ui";

export interface NavGroup {
  group: string;
  items: { slug: string; title: string }[];
}

export function GuideSidebar({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-6">
      {groups.map((g) => (
        <div key={g.group}>
          <div className="mb-1.5 px-2 text-xs font-semibold tracking-wider text-stone-400 uppercase">
            {g.group}
          </div>
          <ul className="space-y-0.5">
            {g.items.map((item) => {
              const href = `/guide/${item.slug}`;
              const active = pathname === href;
              return (
                <li key={item.slug}>
                  <Link
                    href={href}
                    className={cn(
                      "block rounded-md px-2 py-1.5 text-sm transition-colors",
                      active
                        ? "bg-stone-200/60 dark:bg-stone-700 font-medium text-stone-900 dark:text-stone-100"
                        : "text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100"
                    )}
                  >
                    {item.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
