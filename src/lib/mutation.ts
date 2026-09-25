export type MutationResult = {
  error?: string;
  fieldErrors?: Record<string, string>;
  message?: string;
  redirectTo?: string;
};

export function applicationReturn(value: unknown): string {
  if (typeof value !== "string") return "/applications";
  // Only preserve filters within the application list, never an arbitrary URL.
  return value === "/applications" || value.startsWith("/applications?") ? value : "/applications";
}

export function calendarDaysUntil(value: string, today = new Date()): number {
  const [year, month, day] = value.split("-").map(Number);
  return Math.round((Date.UTC(year, month - 1, day) - Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) / 86_400_000);
}
