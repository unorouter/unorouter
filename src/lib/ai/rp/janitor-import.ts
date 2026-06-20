// Client-side import of a JanitorAI character via JannyAI (the community mirror
// that serves JanitorAI bots as downloadable cards). JanitorAI has no official
// export; JannyAI's public download API does. All fetches run in the browser
// (CORS + COEP verified), so no server route is needed and the local-first RP
// model is preserved.

import { msg } from "@/lib/config/constants";

// Configurable: JannyAI rebranded api.janitorai.me -> api.jannyai.com once before.
const JANNY_API_BASE =
  process.env.NEXT_PUBLIC_JANNY_API_BASE ?? "https://api.jannyai.com/api/v1";

const ALLOWED_HOSTS = new Set([
  "janitorai.com",
  "www.janitorai.com",
  "janitor.ai",
  "www.janitor.ai",
  "jannyai.com",
  "www.jannyai.com",
]);

// Matches exactly a 8-4-4-4-12 UUID and stops, so a trailing "_slug" is excluded.
// The download API rejects a slug-appended id with 401, so stripping is mandatory.
const UUID_RE = /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i;

// The media table inlines base64; keep OPFS rows reasonable.
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export function extractCharacterId(input: string): string | null {
  const match = UUID_RE.exec(input);
  return match ? match[0].toLowerCase() : null;
}

// Validate a pasted value (a JanitorAI/JannyAI URL, or a bare UUID) and return
// the clean character UUID. Throws ERRORS.JANITOR_INVALID_URL on anything else.
export function parseJanitorInput(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) throw new Error(msg("ERRORS.JANITOR_INVALID_URL"));

  let url: URL | null = null;
  try {
    url = new URL(trimmed);
  } catch {
    url = null;
  }

  if (url) {
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error(msg("ERRORS.JANITOR_INVALID_URL"));
    }
    if (!ALLOWED_HOSTS.has(url.hostname.toLowerCase())) {
      throw new Error(msg("ERRORS.JANITOR_INVALID_URL"));
    }
    const id = extractCharacterId(url.href);
    if (!id) throw new Error(msg("ERRORS.JANITOR_INVALID_URL"));
    return id;
  }

  // Not a URL: accept a bare UUID paste.
  const id = extractCharacterId(trimmed);
  if (!id) throw new Error(msg("ERRORS.JANITOR_INVALID_URL"));
  return id;
}

// Full pipeline: input -> validated UUID -> JannyAI download API -> PNG -> File
// ready for parseCharacterCardFile. The PNG is a TavernAI V1 flat card that
// character-foundry auto-upgrades to v3, so no normalization is needed here.
export async function fetchJanitorCharacterFile(input: string): Promise<File> {
  const characterId = parseJanitorInput(input);

  // Do NOT set User-Agent/Referer: browsers forbid those headers on fetch. The
  // natural UA/origin is what was verified working against the API + CDN.
  let dl: Response;
  try {
    dl = await fetch(`${JANNY_API_BASE}/download`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ characterId }),
    });
  } catch {
    throw new Error(msg("ERRORS.JANITOR_NETWORK_FAILED"));
  }

  if (dl.status === 401) throw new Error(msg("ERRORS.JANITOR_INVALID_URL"));

  const json = (await dl.json().catch(() => null)) as {
    status?: string;
    downloadUrl?: unknown;
  } | null;

  if (!(dl.ok && json?.status === "ok" && typeof json.downloadUrl === "string")) {
    // 200 {status:"error"} = deleted/private/missing (error may be string or
    // object; never surface untrusted text). Anything else = unexpected shape.
    if (json?.status === "error") {
      throw new Error(msg("ERRORS.JANITOR_NOT_FOUND"));
    }
    throw new Error(msg("ERRORS.JANITOR_DOWNLOAD_FAILED"));
  }

  // Use fetch() (not <img>) so the chat page's COEP require-corp does not gate
  // this cross-origin request; JannyAI's CDN allows it via CORS.
  let img: Response;
  try {
    img = await fetch(json.downloadUrl);
  } catch {
    throw new Error(msg("ERRORS.JANITOR_NETWORK_FAILED"));
  }
  if (!img.ok) throw new Error(msg("ERRORS.JANITOR_IMAGE_FAILED"));

  const buf = await img.arrayBuffer();
  if (buf.byteLength > MAX_IMAGE_BYTES) {
    throw new Error(msg("ERRORS.JANITOR_IMAGE_TOO_LARGE"));
  }
  const mime = img.headers.get("content-type")?.split(";")[0] || "image/png";
  return new File([buf], `${characterId}.png`, { type: mime });
}
