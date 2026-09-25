import type { Job } from "@/lib/types";

export function matchesJobSearch(job: Pick<Job, "title" | "company" | "location">, query: string): boolean {
  const searchable = `${job.title} ${job.company} ${job.location ?? ""}`.toLocaleLowerCase();
  return query.toLocaleLowerCase().trim().split(/\s+/).every((term) => searchable.includes(term));
}
