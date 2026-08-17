import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client for trusted server-side routes (the MCP endpoint),
// which authenticate with MCP_TOKEN instead of a user session.
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
