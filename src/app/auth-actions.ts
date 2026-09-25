"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function requestPasswordReset(email: string): Promise<{ error?: string }> {
  const address = email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
    return { error: "Enter a valid email address." };
  }
  // Server Actions validate Origin against Host before this action runs.
  const origin = (await headers()).get("origin");
  if (!origin) return { error: "Refresh this page and try again." };
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(address, {
    redirectTo: new URL("/auth/callback", origin).toString(),
  });
  if (error) {
    return { error: error.status === 429
      ? "Too many requests. Wait a few minutes before trying again."
      : "We couldn’t send a reset link. Please try again in a few minutes." };
  }
  return {};
}

export async function updatePassword(password: string, confirmation: string): Promise<{ error?: string }> {
  if (password.length < 8) return { error: "Use at least 8 characters for your new password." };
  if (password !== confirmation) return { error: "Your passwords don’t match. Enter them again." };
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Your reset session has expired. Request a new reset link." };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  // End this recovery session; the user signs in with their new password.
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login?password=updated");
}

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
