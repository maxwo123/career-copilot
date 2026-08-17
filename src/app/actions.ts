"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

// ---------------------------------------------------------------- jobs ----

export async function createJob(formData: FormData) {
  const supabase = await createClient();
  const company = String(formData.get("company") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  if (!company || !title) return;

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
  if (error) throw new Error(error.message);

  await logActivity(supabase, "add_job", `Added ${title} @ ${company}`, data.id);
  revalidatePath("/");
  redirect(`/jobs/${data.id}`);
}

export async function updateJobStatus(jobId: string, formData: FormData) {
  const status = String(formData.get("status") ?? "") as JobStatus;
  if (!JOB_STATUSES.includes(status)) return;

  const supabase = await createClient();
  const patch: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (status === "applied") patch.applied_at = new Date().toISOString();

  const { error } = await supabase.from("jobs").update(patch).eq("id", jobId);
  if (error) throw new Error(error.message);

  await logActivity(supabase, "update_status", `Status → ${status}`, jobId);
  revalidatePath("/");
  revalidatePath(`/jobs/${jobId}`);
}

export async function updateJobDetails(jobId: string, formData: FormData) {
  const supabase = await createClient();
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
  if (error) throw new Error(error.message);
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/");
}

export async function deleteJob(jobId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("jobs").delete().eq("id", jobId);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  redirect("/");
}

// ------------------------------------------------------------- profile ----

export async function saveProfileHeader(formData: FormData) {
  const supabase = await createClient();
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

  const { data: existing } = await supabase
    .from("profile")
    .select("id")
    .maybeSingle();

  const { error } = existing
    ? await supabase.from("profile").update(values).eq("id", existing.id)
    : await supabase.from("profile").insert(values);
  if (error) throw new Error(error.message);
  revalidatePath("/profile");
}

export async function addProfileEntry(formData: FormData) {
  const section = String(formData.get("section") ?? "") as Section;
  if (!SECTIONS.includes(section)) return;

  const supabase = await createClient();
  const { error } = await supabase.from("profile_entries").insert({
    section,
    title: String(formData.get("title") ?? "").trim(),
    organization: String(formData.get("organization") ?? "").trim(),
    location: String(formData.get("location") ?? "").trim(),
    date_range: String(formData.get("date_range") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    sort_order: Number(formData.get("sort_order") ?? 0) || 0,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/profile");
}

export async function updateProfileEntry(entryId: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("profile_entries")
    .update({
      title: String(formData.get("title") ?? "").trim(),
      organization: String(formData.get("organization") ?? "").trim(),
      location: String(formData.get("location") ?? "").trim(),
      date_range: String(formData.get("date_range") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      sort_order: Number(formData.get("sort_order") ?? 0) || 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", entryId);
  if (error) throw new Error(error.message);
  revalidatePath("/profile");
}

export async function deleteProfileEntry(entryId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("profile_entries")
    .delete()
    .eq("id", entryId);
  if (error) throw new Error(error.message);
  revalidatePath("/profile");
}

// ------------------------------------------------------ skills (chips) ----

export async function addSkillCategory(name: string): Promise<{ id?: string; error?: string }> {
  const title = name.trim();
  if (!title) return { error: "Category name is required." };

  const supabase = await createClient();
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
  revalidatePath("/profile");
  return { id: data.id };
}

export async function setSkillList(
  entryId: string,
  skills: string[]
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const description = skills.map((s) => s.trim()).filter(Boolean).join(", ");
  const { error } = await supabase
    .from("profile_entries")
    .update({ description, updated_at: new Date().toISOString() })
    .eq("id", entryId)
    .eq("section", "skills");
  if (error) return { error: error.message };
  revalidatePath("/profile");
  return {};
}

// ----------------------------------------------------------- documents ----

export async function deleteDocument(docId: string, jobId: string | null) {
  const supabase = await createClient();
  const { error } = await supabase.from("documents").delete().eq("id", docId);
  if (error) throw new Error(error.message);
  if (jobId) revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/");
}
