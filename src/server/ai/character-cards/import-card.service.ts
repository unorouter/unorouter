import { msg } from "@/lib/config/constants";
import { safeFetchBytes, safeFetchRaw } from "@/lib/config/r2";

// Endpoint bases (the verified public hosts). Kept here so they are easy to
// retarget if a source rebrands (JannyAI already migrated .me -> .com once).
const JANNY_API_BASE =
  process.env.JANNY_API_BASE ?? "https://api.jannyai.com/api/v1";
const CHUB_AVATAR_BASE =
  process.env.CHUB_AVATAR_BASE ?? "https://avatars.charhub.io/avatars";
const RISU_REALM_BASE =
  process.env.RISU_REALM_BASE ?? "https://realm.risuai.net/api/v1/download";

const MAX_CARD_BYTES = 10 * 1024 * 1024;

const UUID_RE = /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i;

const JANITOR_HOSTS = new Set([
  "janitorai.com",
  "www.janitorai.com",
  "janitor.ai",
  "www.janitor.ai",
  "jannyai.com",
  "www.jannyai.com",
]);
const CHUB_HOSTS = new Set([
  "chub.ai",
  "www.chub.ai",
  "characterhub.org",
  "www.characterhub.org",
]);
const RISU_HOSTS = new Set(["realm.risuai.net"]);

export type ImportedCard = {
  cardData: string; // base64
  mimeType: string;
  sizeBytes: number;
};

function toResult(buffer: Buffer, contentType: string | null): ImportedCard {
  return {
    cardData: buffer.toString("base64"),
    mimeType: contentType?.split(";")[0]?.trim() || "image/png",
    sizeBytes: buffer.length,
  };
}

// JanitorAI/JannyAI: POST the UUID to the JannyAI download API (returns JSON
// {downloadUrl}), then fetch the PNG. UUID must be stripped of any _slug.
async function importJanitor(href: string): Promise<ImportedCard> {
  const id = UUID_RE.exec(href)?.[0].toLowerCase();
  if (!id) throw new Error(msg("ERRORS.CARD_IMPORT_INVALID_URL"));

  const api = await safeFetchRaw(`${JANNY_API_BASE}/download`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ characterId: id }),
    maxBytes: 64 * 1024,
  });
  if (api.status === 401) throw new Error(msg("ERRORS.CARD_IMPORT_INVALID_URL"));

  const json = (() => {
    try {
      return JSON.parse(api.buffer.toString("utf8")) as {
        status?: string;
        downloadUrl?: unknown;
      };
    } catch {
      return null;
    }
  })();
  if (!(api.status === 200 && json?.status === "ok" && typeof json.downloadUrl === "string")) {
    if (json?.status === "error") {
      throw new Error(msg("ERRORS.CARD_IMPORT_NOT_FOUND"));
    }
    throw new Error(msg("ERRORS.CARD_IMPORT_FETCH_FAILED"));
  }

  const png = await safeFetchBytes(json.downloadUrl, MAX_CARD_BYTES);
  return toResult(png.buffer, png.contentType);
}

// Chub: /characters/<author>/<slug> -> the ready V2 card PNG on charhub.io.
async function importChub(url: URL): Promise<ImportedCard> {
  const parts = url.pathname.split("/").filter(Boolean);
  const idx = parts.indexOf("characters");
  const author = idx >= 0 ? parts[idx + 1] : undefined;
  const slug = idx >= 0 ? parts[idx + 2] : undefined;
  if (!author || !slug) throw new Error(msg("ERRORS.CARD_IMPORT_INVALID_URL"));
  const png = await safeFetchBytes(
    `${CHUB_AVATAR_BASE}/${encodeURIComponent(author)}/${encodeURIComponent(slug)}/chara_card_v2.png`,
    MAX_CARD_BYTES,
  );
  return toResult(png.buffer, png.contentType);
}

// RisuRealm: /character/<uuid> -> png-v3 download (dual-spec card).
async function importRisu(href: string): Promise<ImportedCard> {
  const id = UUID_RE.exec(href)?.[0].toLowerCase();
  if (!id) throw new Error(msg("ERRORS.CARD_IMPORT_INVALID_URL"));
  const png = await safeFetchBytes(
    `${RISU_REALM_BASE}/png-v3/${id}?non_commercial=true`,
    MAX_CARD_BYTES,
  );
  return toResult(png.buffer, png.contentType);
}

// Resolve a pasted link to card bytes (base64). Detects the source by host and
// proxies the fetch server-side (SSRF-guarded), so the client never deals with
// CORS and the chat data stays local. A non-recognized http(s) URL is fetched
// directly (a raw card PNG/JSON), letting the client parser validate it.
export async function importCardFromUrl(input: string): Promise<ImportedCard> {
  const trimmed = input.trim();
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error(msg("ERRORS.CARD_IMPORT_INVALID_URL"));
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(msg("ERRORS.CARD_IMPORT_INVALID_URL"));
  }
  const host = url.hostname.toLowerCase();

  if (JANITOR_HOSTS.has(host)) return importJanitor(url.href);
  if (CHUB_HOSTS.has(host)) return importChub(url);
  if (RISU_HOSTS.has(host)) return importRisu(url.href);

  // Direct card URL (e.g. a raw PNG/JSON on github/discord/charhub).
  const direct = await safeFetchBytes(url.href, MAX_CARD_BYTES);
  return toResult(direct.buffer, direct.contentType);
}
