import { PageHeader } from "@/lib/ui";
import { VaultClient } from "./vault-client";

export default function VaultPage() {
  return <div className="mx-auto max-w-3xl space-y-6">
    <PageHeader title="Login vault" description="Keep employer account credentials encrypted with a separate vault passphrase." />
    <VaultClient />
  </div>;
}
