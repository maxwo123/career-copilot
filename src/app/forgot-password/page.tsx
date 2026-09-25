import { AuthShell } from "@/lib/auth-shell";
import { RecoveryForm } from "./recovery-form";

export default async function ForgotPasswordPage({ searchParams }: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <AuthShell title="Reset your password" description="Enter your account email and we’ll send you a link to choose a new password.">
      <RecoveryForm invalidLink={error === "invalid_link"} />
    </AuthShell>
  );
}
