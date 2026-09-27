import type { Profile } from "@/lib/types";

export const APPLICATION_PROFILE_FIELDS = [
  "gpa",
  "us_work_authorized",
  "requires_sponsorship",
  "general_availability",
  "preferred_application_email",
] as const;

type ApplicationProfileField = (typeof APPLICATION_PROFILE_FIELDS)[number];
export type ApplicationProfilePatch = Pick<Profile, ApplicationProfileField>;

export function parseApplicationProfilePatch(input: Record<string, unknown>): {
  patch: Partial<ApplicationProfilePatch>;
  fieldErrors: Partial<Record<ApplicationProfileField, string>>;
} {
  const patch: Partial<ApplicationProfilePatch> = {};
  const fieldErrors: Partial<Record<ApplicationProfileField, string>> = {};

  if (Object.hasOwn(input, "gpa")) {
    const raw = input.gpa;
    if (raw === null || raw === "") patch.gpa = null;
    else {
      const text = typeof raw === "string" ? raw.trim() : String(raw);
      const value = Number(text);
      if (!/^\d{1,2}(?:\.\d{1,3})?$/.test(text) || !Number.isFinite(value) || value > 10) {
        fieldErrors.gpa = "Enter a GPA from 0 to 10 with up to three decimal places.";
      } else patch.gpa = value;
    }
  }

  for (const field of ["us_work_authorized", "requires_sponsorship"] as const) {
    if (!Object.hasOwn(input, field)) continue;
    const value = input[field];
    if (value === null || value === "") patch[field] = null;
    else if (value === true || value === "yes") patch[field] = true;
    else if (value === false || value === "no") patch[field] = false;
    else fieldErrors[field] = "Choose yes, no, or not specified.";
  }

  if (Object.hasOwn(input, "general_availability")) {
    const value = input.general_availability;
    if (value === null || value === "") patch.general_availability = null;
    else if (typeof value !== "string" || value.trim().length > 500) fieldErrors.general_availability = "Keep availability under 500 characters.";
    else patch.general_availability = value.trim() || null;
  }

  if (Object.hasOwn(input, "preferred_application_email")) {
    const value = input.preferred_application_email;
    if (value === null || value === "") patch.preferred_application_email = null;
    else if (typeof value !== "string") fieldErrors.preferred_application_email = "Enter a valid email address.";
    else {
      const email = value.trim();
      if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
        fieldErrors.preferred_application_email = "Enter a valid email address.";
      } else patch.preferred_application_email = email || null;
    }
  }

  return { patch, fieldErrors };
}
