"use server";

import { revalidatePath } from "next/cache";
import { applicationReturn, type MutationResult } from "@/lib/mutation";
import { createClient } from "@/lib/supabase/server";
import type { JobStatus, Section } from "@/lib/types";
import { JOB_STATUSES, SECTIONS } from "@/lib/types";

async function logActivity(
  supabase: Awaited<ReturnType<typeof createClient>>,
  action: string,
  detail: string,
  job_id: string | null = null
) {
  await supabase
    .from("activity")
    .insert({ actor: "user", action, detail, job_id });
}

async function authenticatedClient() {
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) throw new Error("Sign in again to save changes.");
  return client;
}

function refreshWorkspace(jobId?: string) {
  for (const path of ["/", "/applications", "/documents", "/profile"]) revalidatePath(path);
  if (jobId) revalidatePath(`/jobs/${jobId}`);
}

// ---------------------------------------------------------------- jobs ----

export async function createJob(formData: FormData): Promise<MutationResult> {
  const supabase = await authenticatedClient();
  const company = String(formData.get("company") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  if (!company || !title) return { error: "Enter the company and job title.", fieldErrors: { ...(!company ? { company: "Company is required." } : {}), ...(!title ? { title: "Job title is required." } : {}) } };

  const deadline = String(formData.get("deadline") ?? "").trim();
  const { data, error } = await supabase
    .from("jobs")
    .insert({
      company,
      title,
      url: String(formData.get("url") ?? "").trim(),
      source: String(formData.get("source") ?? "").trim(),
      location: String(formData.get("location") ?? "").trim(),
      jd_text: String(formData.get("jd_text") ?? "").trim(),
      notes: String(formData.get("notes") ?? "").trim(),
      deadline: deadline || null,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await logActivity(supabase, "add_job", `Added ${title} @ ${company}`, data.id);
  refreshWorkspace();
  return { redirectTo: `/jobs/${data.id}` };
}

export async function updateJobStatus(jobId: string, formData: FormData): Promise<MutationResult> {
  const status = String(formData.get("status") ?? "") as JobStatus;
  if (!JOB_STATUSES.includes(status)) return { error: "Choose a valid status." };

  const supabase = await authenticatedClient();
  const patch: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  const { data: current, error: readError } = await supabase.from("jobs").select("applied_at").eq("id", jobId).single();
  if (readError || !current) return { error: "Couldn’t load this job. Refresh and try again." };
  if (status === "applied" && !current.applied_at) patch.applied_at = new Date().toISOString();

  const { error } = await supabase.from("jobs").update(patch).eq("id", jobId);
  if (error) return { error: error.message };

  await logActivity(supabase, "update_status", `Status → ${status}`, jobId);
  refreshWorkspace(jobId);
  return { message: "Status saved." };
}

export async function updateJobDetails(jobId: string, formData: FormData): Promise<MutationResult> {
  const supabase = await authenticatedClient();
  const deadline = String(formData.get("deadline") ?? "").trim();
  const { error } = await supabase
    .from("jobs")
    .update({
      url: String(formData.get("url") ?? "").trim(),
      source: String(formData.get("source") ?? "").trim(),
      location: String(formData.get("location") ?? "").trim(),
      notes: String(formData.get("notes") ?? "").trim(),
      jd_text: String(formData.get("jd_text") ?? "").trim(),
      deadline: deadline || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);
  if (error) return { error: error.message };
  refreshWorkspace(jobId);
  return { message: "Job details saved." };
}

export async function deleteJob(jobId: string, formData?: FormData): Promise<MutationResult> {
  const supabase = await authenticatedClient();
  const { error } = await supabase.from("jobs").delete().eq("id", jobId);
  if (error) return { error: error.message };
  refreshWorkspace();
  return { redirectTo: applicationReturn(formData?.get("returnTo")) };
}

// ------------------------------------------------- career coach (home) ----

export async function createNote(values: {
  title: string;
  body: string;
  scheduled_for: string | null;
  sort_order: number;
}): Promise<{ id?: string; error?: string }> {
  const supabase = await authenticatedClient();
  const { data, error } = await supabase
    .from("coach_notes")
    .insert(values)
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/");
  return { id: data.id };
}

export async function updateNote(
  noteId: string,
  patch: Partial<{ title: string; body: string; scheduled_for: string | null }>
): Promise<{ error?: string }> {
  const supabase = await authenticatedClient();
  const { error } = await supabase
    .from("coach_notes")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", noteId);
  if (error) return { error: error.message };
  revalidatePath("/");
  return {};
}

export async function deleteNote(noteId: string): Promise<{ error?: string }> {
  const supabase = await authenticatedClient();
  const { error } = await supabase
    .from("coach_notes")
    .delete()
    .eq("id", noteId);
  if (error) return { error: error.message };
  revalidatePath("/");
  return {};
}

// ------------------------------------------------------------ timeline ----

export async function addTimelineEvent(formData: FormData): Promise<MutationResult> {
  const supabase = await authenticatedClient();
  const company = String(formData.get("company") ?? "").trim();
  if (!company) return { error: "Enter a company name." };

  const starts = String(formData.get("starts_on") ?? "").trim();
  const ends = String(formData.get("ends_on") ?? "").trim();
  if (starts && ends && starts > ends) return { error: "The closing date must be on or after the opening date.", fieldErrors: { ends_on: "Choose a closing date after the opening date." } };
  const { error } = await supabase.from("timeline_events").insert({
    company,
    program: String(formData.get("program") ?? "").trim(),
    window_label: String(formData.get("window_label") ?? "").trim(),
    starts_on: starts || null,
    ends_on: ends || null,
    url: String(formData.get("url") ?? "").trim(),
    notes: String(formData.get("notes") ?? "").trim(),
  });
  if (error) return { error: error.message };
  await logActivity(supabase, "add_timeline_event", `Timeline: added ${company}`);
  refreshWorkspace();
  return { message: "Saved." };
}

export async function deleteTimelineEvent(eventId: string): Promise<MutationResult> {
  const supabase = await authenticatedClient();
  const { error } = await supabase
    .from("timeline_events")
    .delete()
    .eq("id", eventId);
  if (error) return { error: error.message };
  refreshWorkspace();
  return { message: "Saved." };
}

// Promote a timeline event into a tracked job (status "saved") and link it.
export async function trackTimelineEvent(eventId: string, formData?: FormData): Promise<MutationResult> {
  const supabase = await authenticatedClient();
  const { data: eventRow } = await supabase
    .from("timeline_events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle();
  if (!eventRow) return { error: "This timeline event is no longer available." };
  const context = new URLSearchParams({ returnTo: applicationReturn(formData?.get("returnTo")) });
  if (eventRow.job_id) return { redirectTo: `/jobs/${eventRow.job_id}?${context}` };

  const { data: job, error } = await supabase
    .from("jobs")
    .insert({
      company: eventRow.company,
      title: eventRow.program || "Internship",
      url: eventRow.url,
      source: "timeline",
      notes: eventRow.notes,
      deadline: eventRow.ends_on,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await supabase
    .from("timeline_events")
    .update({ job_id: job.id, updated_at: new Date().toISOString() })
    .eq("id", eventId);
  await logActivity(
    supabase,
    "track_timeline_event",
    `Timeline → tracker: ${eventRow.program || "Internship"} @ ${eventRow.company}`,
    job.id
  );
  refreshWorkspace();
  revalidatePath("/");
  return { redirectTo: `/jobs/${job.id}?${context}` };
}

// ------------------------------------------------------------- profile ----

export async function saveProfileHeader(formData: FormData): Promise<MutationResult> {
  const supabase = await authenticatedClient();
  const values = {
    full_name: String(formData.get("full_name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    location: String(formData.get("location") ?? "").trim(),
    linkedin_url: String(formData.get("linkedin_url") ?? "").trim(),
    github_url: String(formData.get("github_url") ?? "").trim(),
    website_url: String(formData.get("website_url") ?? "").trim(),
    summary: String(formData.get("summary") ?? "").trim(),
    updated_at: new Date().toISOString(),
  };

  const { data: existing, error: readError } = await supabase
    .from("profile")
    .select("id")
    .maybeSingle();

  if (readError) return { error: "Couldn’t load your profile. Your draft is still here; try again." };
  const { error } = existing
    ? await supabase.from("profile").update(values).eq("id", existing.id)
    : await supabase.from("profile").insert(values);
  if (error) return { error: error.message };
  refreshWorkspace();
  return { message: "Saved." };
}

export async function addProfileEntry(formData: FormData): Promise<MutationResult> {
  const section = String(formData.get("section") ?? "") as Section;
  if (!SECTIONS.includes(section)) return { error: "Choose a valid profile section." };

  const supabase = await authenticatedClient();
  const { data: siblings, error: orderError } = await supabase.from("profile_entries").select("sort_order").eq("section", section);
  if (orderError) return { error: "Couldn’t load section ordering. Try again." };
  const nextOrder = Math.max(-1, ...(siblings ?? []).map((row) => row.sort_order)) + 1;
  const { error } = await supabase.from("profile_entries").insert({
    section,
    title: String(formData.get("title") ?? "").trim(),
    organization: String(formData.get("organization") ?? "").trim(),
    location: String(formData.get("location") ?? "").trim(),
    date_range: String(formData.get("date_range") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    sort_order: nextOrder,
  });
  if (error) return { error: error.message };
  refreshWorkspace();
  return { message: "Saved." };
}

export async function updateProfileEntry(entryId: string, formData: FormData): Promise<MutationResult> {
  const supabase = await authenticatedClient();
  const { error } = await supabase
    .from("profile_entries")
    .update({
      title: String(formData.get("title") ?? "").trim(),
      organization: String(formData.get("organization") ?? "").trim(),
      location: String(formData.get("location") ?? "").trim(),
      date_range: String(formData.get("date_range") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", entryId);
  if (error) return { error: error.message };
  refreshWorkspace();
  return { message: "Saved." };
}

export async function deleteProfileEntry(entryId: string): Promise<MutationResult> {
  const supabase = await authenticatedClient();
  const { error } = await supabase
    .from("profile_entries")
    .delete()
    .eq("id", entryId);
  if (error) return { error: error.message };
  refreshWorkspace();
  return { message: "Saved." };
}

// ------------------------------------------------------ skills (chips) ----

export async function addSkillCategory(name: string): Promise<{ id?: string; error?: string }> {
  const title = name.trim();
  if (!title) return { error: "Category name is required." };

  const supabase = await authenticatedClient();
  const { data: existing } = await supabase
    .from("profile_entries")
    .select("id, sort_order")
    .eq("section", "skills");
  const nextSort =
    (existing ?? []).reduce((m, e) => Math.max(m, e.sort_order ?? 0), -1) + 1;

  const { data, error } = await supabase
    .from("profile_entries")
    .insert({ section: "skills", title, description: "", sort_order: nextSort })
    .select("id")
    .single();
  if (error) return { error: error.message };
  refreshWorkspace();
  return { id: data.id };
}

export async function setSkillList(
  entryId: string,
  skills: string[]
): Promise<{ error?: string }> {
  const supabase = await authenticatedClient();
  const description = skills.map((s) => s.trim()).filter(Boolean).join(", ");
  const { error } = await supabase
    .from("profile_entries")
    .update({ description, updated_at: new Date().toISOString() })
    .eq("id", entryId)
    .eq("section", "skills");
  if (error) return { error: error.message };
  refreshWorkspace();
  return {};
}

// ----------------------------------------------------------- documents ----

export async function deleteDocument(docId: string, jobId: string | null): Promise<MutationResult> {
  const supabase = await authenticatedClient();
  const { error } = await supabase.from("documents").delete().eq("id", docId);
  if (error) return { error: error.message };
  refreshWorkspace(jobId ?? undefined);
  return { message: "Saved." };
}

export async function moveProfileEntry(entryId: string, direction: "up" | "down"): Promise<MutationResult> {
  const supabase = await authenticatedClient();
  const { data: entry, error } = await supabase.from("profile_entries").select("section").eq("id", entryId).single();
  if (error || !entry) return { error: "Entry not found. Refresh the page." };
  const { data: rows, error: listError } = await supabase.from("profile_entries").select("id, sort_order").eq("section", entry.section).order("sort_order").order("created_at");
  if (listError || !rows) return { error: "Couldn’t load the section. Try again." };
  const index = rows.findIndex((row) => row.id === entryId);
  const target = index + (direction === "up" ? -1 : 1);
  if (index < 0 || target < 0 || target >= rows.length) return {};
  const ordered = [...rows];
  [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
  // One upsert changes ordering atomically; omitted content columns are not updated.
  const { error: moveError } = await supabase.from("profile_entries").upsert(
    ordered.map((row, i) => ({ id: row.id, section: entry.section, sort_order: i * 10 })),
    { onConflict: "id" }
  );
  if (moveError) return { error: moveError.message };
  refreshWorkspace();
  return { message: "Order updated." };
}
