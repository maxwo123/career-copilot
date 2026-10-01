import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyVaultKey, wrapVaultKey } from "@/lib/vault-agent-access";

function reply(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function sameOrigin(request: NextRequest) {
  return request.headers.get("origin") === new URL(request.url).origin;
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return reply({ error: "Invalid request origin." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return reply({ error: "Expected JSON." }, 415);
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return reply({ error: "Sign in again to enable agent access." }, 401);

  let key: unknown;
  try { key = (await request.json()).key; } catch { return reply({ error: "Invalid request." }, 400); }
  if (typeof key !== "string" || !/^[A-Za-z0-9+/]{43}=$/.test(key))
    return reply({ error: "Invalid vault key." }, 400);
  const rawKey = Buffer.from(key, "base64");
  if (rawKey.length !== 32) return reply({ error: "Invalid vault key." }, 400);

  const { data: settings, error: settingsError } = await supabase.from("credential_vault_settings")
    .select("verifier_iv, verifier_ciphertext").eq("user_id", user.id).maybeSingle();
  if (settingsError || !settings) return reply({ error: "Create a vault first." }, 400);
  try {
    if (!verifyVaultKey(rawKey, settings.verifier_iv, settings.verifier_ciphertext))
      return reply({ error: "Incorrect vault passphrase." }, 400);
  } catch { return reply({ error: "Incorrect vault passphrase." }, 400); }

  const wrapped = wrapVaultKey(rawKey);
  const { error } = await supabase.from("credential_vault_agent_access").upsert({
    user_id: user.id,
    wrapped_key_iv: wrapped.iv,
    wrapped_key_ciphertext: wrapped.ciphertext,
  });
  if (error) return reply({ error: "Couldn’t enable agent access." }, 500);
  return reply({ enabled: true });
}

export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) return reply({ error: "Invalid request origin." }, 403);
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return reply({ error: "Sign in again to disable agent access." }, 401);
  const { error } = await supabase.from("credential_vault_agent_access").delete().eq("user_id", user.id);
  if (error) return reply({ error: "Couldn’t disable agent access." }, 500);
  return reply({ enabled: false });
}
