"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function signIn(
  email: string,
  password: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// First-run account creation for this single-user app. Supabase's default
// email-confirmation flow would leave a signup unconfirmed (and unable to log
// in), so the first account is created pre-confirmed via the service role.
// Refuses to run once a confirmed account exists.
export async function bootstrapAccount(
  email: string,
  password: string
): Promise<{ error?: string }> {
  const admin = createServiceClient();

  const { data, error } = await admin.auth.admin.listUsers();
  if (error) return { error: error.message };

  if (data.users.some((u) => u.email_confirmed_at)) {
    return { error: "An account already exists — use Sign in instead." };
  }

  // Clean up any unconfirmed users from earlier failed signup attempts.
  for (const u of data.users) {
    await admin.auth.admin.deleteUser(u.id);
  }

  const { error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr) return { error: createErr.message };
  return {};
}
