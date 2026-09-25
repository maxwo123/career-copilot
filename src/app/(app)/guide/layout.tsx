import { DOCS, DOC_GROUPS } from "./docs";
import { GuideSidebar, type NavGroup } from "./sidebar";

// Docs-style layout: sticky sidebar navigation on the left, doc content on
// the right (stacked on mobile).
export default function GuideLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const groups: NavGroup[] = DOC_GROUPS.map((group) => ({
    group,
    items: DOCS.filter((d) => d.group === group).map((d) => ({
      slug: d.slug,
      title: d.title,
    })),
  }));

  return (
    <div className="flex flex-col gap-8 md:flex-row md:gap-12">
      <aside className="shrink-0 md:sticky md:top-20 md:w-52 md:self-start">
        <details className="md:hidden rounded-xl border border-stone-200 p-4 dark:border-stone-700"><summary className="cursor-pointer font-medium">Browse getting started</summary><div className="mt-4"><GuideSidebar groups={groups} /></div></details>
        <div className="hidden md:block"><GuideSidebar groups={groups} /></div>
      </aside>
      <div className="min-w-0 max-w-2xl flex-1">{children}</div>
    </div>
  );
}
