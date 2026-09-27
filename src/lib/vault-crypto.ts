const encoder = new TextEncoder();
const decoder = new TextDecoder();
const ITERATIONS = 600_000;

export function randomBase64(bytes: number): string {
  const value = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...value));
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

export async function deriveVaultKey(passphrase: string, salt: string): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw", encoder.encode(passphrase), "PBKDF2", false, ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: fromBase64(salt), iterations: ITERATIONS, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptVaultText(key: CryptoKey, value: string) {
  const iv = randomBase64(12);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: fromBase64(iv) }, key, encoder.encode(value)
  );
  return { iv, ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext))) };
}

export async function decryptVaultText(key: CryptoKey, iv: string, ciphertext: string) {
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(iv) }, key, fromBase64(ciphertext)
  );
  return decoder.decode(plaintext);
}
