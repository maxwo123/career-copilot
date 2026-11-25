export const CONTEXT_SECTIONS = {
  about: "About me",
  goals: "Goals and priorities",
  projects: "Current projects",
  resume: "Résumé and experience",
  preferences: "Working preferences",
  people: "People in my life",
  logistics: "Daily logistics",
};

export type ContextSection = keyof typeof CONTEXT_SECTIONS;
export const CONTEXT_LIMIT = 20_000;

export function isContextSection(value: unknown): value is ContextSection {
  return typeof value === "string" && Object.hasOwn(CONTEXT_SECTIONS, value);
}
