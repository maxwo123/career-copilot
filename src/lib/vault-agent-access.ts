import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";

const VERIFIER = "Career Copilot credential vault v1";

function encryptionKey() {
  const token = process.env.MCP_TOKEN;
  if (!token || token.length < 32) throw new Error("Vault agent access is not configured.");
  return createHash("sha256").update("career-copilot:vault-agent-key:v1\0").update(token).digest();
}

function encrypt(key: Buffer, value: Buffer) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(value), cipher.final(), cipher.getAuthTag()]);
  return { iv: iv.toString("base64"), ciphertext: ciphertext.toString("base64") };
}

function decrypt(key: Buffer, iv: string, ciphertext: string) {
  const encrypted = Buffer.from(ciphertext, "base64");
  if (encrypted.length < 17) throw new Error("Invalid encrypted data.");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64"));
  decipher.setAuthTag(encrypted.subarray(-16));
  return Buffer.concat([decipher.update(encrypted.subarray(0, -16)), decipher.final()]);
}

export function wrapVaultKey(rawKey: Buffer) {
  if (rawKey.length !== 32) throw new Error("Invalid vault key.");
  return encrypt(encryptionKey(), rawKey);
}

export function verifyVaultKey(rawKey: Buffer, verifierIv: string, verifierCiphertext: string) {
  try { return decrypt(rawKey, verifierIv, verifierCiphertext).toString("utf8") === VERIFIER; }
  catch { return false; }
}

async function loadAgentVaultAccess() {
  const supabase = createServiceClient();
  const { data: accessRows, error: accessError } = await supabase
    .from("credential_vault_agent_access")
    .select("user_id, wrapped_key_iv, wrapped_key_ciphertext")
    .limit(2);
  if (accessError) throw new Error("Vault agent access is unavailable.");
  if (!accessRows?.length) throw new Error("Vault agent access is off. Ask the candidate to enable it in Login vault.");
  if (accessRows.length !== 1) throw new Error("Multiple vaults have agent access enabled; ask the candidate to contact support.");
  const access = accessRows[0];
  let rawKey: Buffer;
  try {
    rawKey = decrypt(encryptionKey(), access.wrapped_key_iv, access.wrapped_key_ciphertext);
  } catch {
    throw new Error("Vault access needs to be enabled again. The agent encryption key may have changed.");
  }
  return { supabase, userId: access.user_id, rawKey };
}

async function loadAgentVault() {
  const { supabase, userId, rawKey } = await loadAgentVaultAccess();
  const { data: items, error: itemsError } = await supabase.from("credential_vault_items")
    .select("id, iv, ciphertext")
    .eq("user_id", userId)
    .order("created_at");
  if (itemsError) throw new Error("Couldn’t load saved logins.");
  return (items ?? []).map((item) => {
    try {
      const login = JSON.parse(decrypt(rawKey, item.iv, item.ciphertext).toString("utf8"));
      if (!login || typeof login.site !== "string" || typeof login.url !== "string" ||
          typeof login.email !== "string" || typeof login.password !== "string") {
        throw new Error("Invalid login");
      }
      return { id: item.id, site: login.site, url: login.url, email: login.email, password: login.password };
    } catch {
      throw new Error("A saved login couldn’t be decrypted. Re-enable agent access with the vault passphrase.");
    }
  });
}

export async function listAgentVaultLogins() {
  const logins = await loadAgentVault();
  return logins.map(({ id, site, url, email }) => ({ login_id: id, site, url, email }));
}

export async function getAgentVaultLogin(id: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(id)) throw new Error("Invalid login id.");
  const login = (await loadAgentVault()).find((item) => item.id === id);
  if (!login) throw new Error("Saved login not found.");
  return { site: login.site, url: login.url, email: login.email, password: login.password };
}

export async function saveAgentVaultLogin(input: { site: string; url: string; email: string; password: string }) {
  const site = input.site?.trim();
  const email = input.email?.trim();
  const url = input.url?.trim() ?? "";
  const password = input.password;
  if (!site || site.length > 120 || !email || email.length > 254 || !password || password.length > 1024)
    throw new Error("A site, email, and password are required.");
  if (url && (!/^https:\/\//i.test(url) || url.length > 2048))
    throw new Error("Login URL must start with https://.");
  const { supabase, userId, rawKey } = await loadAgentVaultAccess();
  const encrypted = encrypt(rawKey, Buffer.from(JSON.stringify({ site, url, email, password })));
  const { data, error } = await supabase.from("credential_vault_items")
    .insert({ user_id: userId, ...encrypted })
    .select("id")
    .single();
  if (error) throw new Error("Couldn’t save the login in the vault.");
  return { login_id: data.id };
}
