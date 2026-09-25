import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AuthShell } from "@/lib/auth-shell";
import { buttonCls } from "@/lib/ui";
import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return (
    <AuthShell title={user ? "Choose a new password" : "Request a new reset link"}
      description={user ? "Use a unique password with at least 8 characters." : "Your reset session is missing or has expired. Request a new link to continue."}>
      {user ? <ResetPasswordForm /> : <Link href="/forgot-password" className={buttonCls("primary", "md", "mt-6 h-11 w-full")}>Request reset link</Link>}
    </AuthShell>
  );
}
