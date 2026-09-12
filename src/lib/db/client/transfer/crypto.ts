import { msg } from "@/lib/config/constants";

const IV_BYTES = 12;
const PBKDF2_ITERATIONS = 100_000;

async function deriveKey(secret: string, salt: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const material = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: enc.encode(salt),
      iterations: PBKDF2_ITERATIONS,
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptTransfer(
  bytes: ArrayBuffer,
  secret: string,
  salt: string,
): Promise<Uint8Array<ArrayBuffer>> {
  const key = await deriveKey(secret, salt);
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    bytes,
  );
  const out = new Uint8Array(IV_BYTES + cipher.byteLength);
  out.set(iv, 0);
  out.set(new Uint8Array(cipher), IV_BYTES);
  return out;
}

export async function decryptTransfer(
  payload: ArrayBuffer,
  secret: string,
  salt: string,
): Promise<ArrayBuffer> {
  if (payload.byteLength <= IV_BYTES)
    throw new Error(msg("ERRORS.TRANSFER_BAD_CODE"));
  const key = await deriveKey(secret, salt);
  const iv = payload.slice(0, IV_BYTES);
  try {
    return await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      payload.slice(IV_BYTES),
    );
  } catch {
    throw new Error(msg("ERRORS.TRANSFER_BAD_CODE"));
  }
}
