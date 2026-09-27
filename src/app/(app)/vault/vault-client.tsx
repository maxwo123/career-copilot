"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { decryptVaultText, deriveVaultKey, encryptVaultText, randomBase64 } from "@/lib/vault-crypto";
import { Button, Card, Field, Input } from "@/lib/ui";

type Settings = { salt: string; verifier_iv: string; verifier_ciphertext: string };
type StoredItem = { id: string; iv: string; ciphertext: string };
type Login = { id: string; site: string; url: string; email: string; password: string };
const VERIFIER = "Career Copilot credential vault v1";

export function VaultClient() {
  const supabase = useRef<ReturnType<typeof createClient> | null>(null);
  const key = useRef<CryptoKey | null>(null);
  const userId = useRef<string | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasUser, setHasUser] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [logins, setLogins] = useState<Login[]>([]);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [site, setSite] = useState("");
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    let active = true;
    void (async () => {
      const client = supabase.current ?? (supabase.current = createClient());
      const { data: { user }, error: authError } = await client.auth.getUser();
      if (!active) return;
      if (authError || !user) { setError("Sign in again to open the vault."); setLoading(false); return; }
      userId.current = user.id;
      setHasUser(true);
      const result = await client.from("credential_vault_settings")
        .select("salt, verifier_iv, verifier_ciphertext").eq("user_id", user.id).maybeSingle();
      if (!active) return;
      if (result.error) setError("The vault is unavailable. Its database migration may still need to be applied.");
      else setSettings(result.data);
      setLoading(false);
    })();
    return () => { active = false; key.current = null; };
  }, []);

  function client() {
    return supabase.current ?? (supabase.current = createClient());
  }

  async function loadItems(unlockKey: CryptoKey, id: string) {
    const result = await client().from("credential_vault_items")
      .select("id, iv, ciphertext").eq("user_id", id).order("created_at");
    if (result.error) throw new Error("Couldn’t load saved logins.");
    const decrypted = await Promise.all(((result.data ?? []) as StoredItem[]).map(async (row) => {
      const value = JSON.parse(await decryptVaultText(unlockKey, row.iv, row.ciphertext)) as Omit<Login, "id">;
      return { ...value, id: row.id };
    }));
    setLogins(decrypted);
  }

  async function openVault(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId.current) return;
    setBusy(true); setError(""); setNotice("");
    try {
      if (!settings && (passphrase.length < 12 || passphrase !== confirmation)) {
        throw new Error("Use a vault passphrase of at least 12 characters and confirm it exactly.");
      }
      const salt = settings?.salt ?? randomBase64(16);
      const unlockKey = await deriveVaultKey(passphrase, salt);
      if (settings) {
        try {
          if (await decryptVaultText(unlockKey, settings.verifier_iv, settings.verifier_ciphertext) !== VERIFIER)
            throw new Error("Invalid verifier");
        } catch { throw new Error("The vault passphrase is incorrect."); }
      } else {
        const verifier = await encryptVaultText(unlockKey, VERIFIER);
        const result = await client().from("credential_vault_settings").insert({
          user_id: userId.current, salt, verifier_iv: verifier.iv,
          verifier_ciphertext: verifier.ciphertext,
        });
        if (result.error) throw new Error("Couldn’t create the vault. Refresh and try again.");
        setSettings({ salt, verifier_iv: verifier.iv, verifier_ciphertext: verifier.ciphertext });
      }
      await loadItems(unlockKey, userId.current);
      key.current = unlockKey;
      setUnlocked(true);
      setPassphrase(""); setConfirmation("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn’t unlock the vault.");
    } finally { setBusy(false); }
  }

  async function saveLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!key.current || !userId.current) return;
    if (!site.trim() || !email.trim() || !password) { setError("Enter the employer, email, and password."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const value = { site: site.trim(), url: url.trim(), email: email.trim(), password };
      const encrypted = await encryptVaultText(key.current, JSON.stringify(value));
      const result = await client().from("credential_vault_items")
        .insert({ user_id: userId.current, ...encrypted }).select("id").single();
      if (result.error) throw new Error("Couldn’t save this login.");
      setLogins((current) => [...current, { id: result.data.id, ...value }]);
      setSite(""); setUrl(""); setEmail(""); setPassword("");
      setNotice("Login saved in the encrypted vault.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Couldn’t save this login."); }
    finally { setBusy(false); }
  }

  async function removeLogin(id: string) {
    if (!window.confirm("Delete this saved login? This cannot be undone.")) return;
    setBusy(true); setError(""); setNotice("");
    const result = await client().from("credential_vault_items").delete().eq("id", id).eq("user_id", userId.current);
    if (result.error) setError("Couldn’t delete this login.");
    else { setLogins((current) => current.filter((entry) => entry.id !== id)); setNotice("Login deleted."); }
    setBusy(false);
  }

  function lock() {
    key.current = null;
    setLogins([]); setUnlocked(false); setRevealed(null);
    setPassword(""); setPassphrase(""); setConfirmation("");
    setNotice("Vault locked.");
  }

  return <>
    <Card className="space-y-4 p-5">
      <p className="text-sm text-stone-600 dark:text-stone-300">Your browser encrypts each login before saving it. The vault passphrase is never sent to Career Copilot or stored in the database. Keep it somewhere you can recover: there is no passphrase reset for encrypted logins.</p>
      <p className="text-sm text-stone-600 dark:text-stone-300">This vault is for your own use. It does not give the connected AI access to passwords or create accounts automatically.</p>
      {loading ? <p role="status">Loading vault…</p> : !unlocked ? <form onSubmit={openVault} className="space-y-4">
        <Field label={settings ? "Vault passphrase" : "Create vault passphrase"}>
          <Input type="password" autoComplete={settings ? "current-password" : "new-password"} value={passphrase} onChange={(event) => setPassphrase(event.target.value)} required minLength={settings ? undefined : 12} />
        </Field>
        {!settings && <Field label="Confirm vault passphrase"><Input type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /></Field>}
        <Button disabled={busy || !hasUser}>{busy ? "Working…" : settings ? "Unlock vault" : "Create vault"}</Button>
      </form> : <div className="flex items-center justify-between gap-3"><span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Vault unlocked for this page</span><Button type="button" variant="secondary" onClick={lock}>Lock</Button></div>}
      {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
      {notice && <p role="status" className="text-sm text-emerald-700 dark:text-emerald-300">{notice}</p>}
    </Card>

    {unlocked && <>
      <Card className="space-y-4 p-5">
        <h2 className="text-lg font-semibold">Add employer login</h2>
        <form onSubmit={saveLogin} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Employer or site"><Input value={site} onChange={(event) => setSite(event.target.value)} required maxLength={120} /></Field>
            <Field label="Login URL"><Input type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://…" /></Field>
            <Field label="Email"><Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="off" /></Field>
            <Field label="Password"><Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="new-password" /></Field>
          </div>
          <Button disabled={busy}>{busy ? "Saving…" : "Save login"}</Button>
        </form>
      </Card>
      <Card className="space-y-4 p-5">
        <h2 className="text-lg font-semibold">Saved logins</h2>
        {logins.length === 0 ? <p className="text-sm text-stone-500">No logins saved yet.</p> : <ul className="space-y-3">{logins.map((login) => <li key={login.id} className="rounded-lg border border-stone-200 p-3 dark:border-stone-700">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><strong>{login.site}</strong><p className="text-sm">{login.email}</p>{login.url && <a href={login.url} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 underline dark:text-indigo-300">Open login page ↗</a>}</div>
            <div className="flex gap-2"><Button type="button" variant="secondary" size="sm" onClick={() => setRevealed(revealed === login.id ? null : login.id)}>{revealed === login.id ? "Hide" : "Reveal"}</Button><Button type="button" variant="danger" size="sm" disabled={busy} onClick={() => void removeLogin(login.id)}>Delete</Button></div></div>
          {revealed === login.id && <p className="mt-3 break-all rounded bg-stone-100 p-2 font-mono text-sm dark:bg-stone-800">{login.password}</p>}
        </li>)}</ul>}
      </Card>
    </>}
  </>;
}
