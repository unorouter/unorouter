import { msg } from "@/lib/config/constants";
import { safeFetchBytes, safeFetchRaw } from "@/lib/config/safe-fetch";
import { randomBytes } from "node:crypto";

const JANNY_API_BASE =
  process.env.JANNY_API_BASE ?? "https://api.jannyai.com/api/v1";
const CHUB_AVATAR_BASE =
  process.env.CHUB_AVATAR_BASE ?? "https://avatars.charhub.io/avatars";
const RISU_REALM_BASE =
  process.env.RISU_REALM_BASE ?? "https://realm.risuai.net/api/v1/download";
const DATACAT_API_BASE =
  process.env.DATACAT_API_BASE ?? "https://datacat.run/api";

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

// JannyAI sits behind a Cloudflare managed challenge, which a server cannot
// solve at any level of header or TLS mimicry: it wants JavaScript executed.
// Datacat holds the same JanitorAI ids, is not challenged, and issues a session
// to an anonymous device token, so it can answer the requests Janny now refuses.
async function importJanitorViaDatacat(id: string): Promise<ImportedCard> {
  const deviceToken = `anon_${randomBytes(16).toString("hex")}_${randomBytes(4).toString("hex")}`;
  const auth = await safeFetchRaw(`${DATACAT_API_BASE}/liberator/identify`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ deviceToken }),
    maxBytes: 64 * 1024,
  });
  const session = (() => {
    try {
      return JSON.parse(auth.buffer.toString("utf8")) as {
        sessionToken?: unknown;
      };
    } catch {
      return null;
    }
  })();
  if (auth.status !== 200 || typeof session?.sessionToken !== "string")
    throw new Error(msg("ERRORS.CARD_IMPORT_FETCH_FAILED"));

  const res = await safeFetchRaw(`${DATACAT_API_BASE}/characters/${id}`, {
    headers: {
      accept: "application/json",
      "x-session-token": session.sessionToken,
    },
    maxBytes: MAX_CARD_BYTES,
  });
  if (res.status === 404) throw new Error(msg("ERRORS.CARD_IMPORT_NOT_FOUND"));
  const body = (() => {
    try {
      return JSON.parse(res.buffer.toString("utf8")) as {
        character?: { chara_card_v2_json?: unknown };
      };
    } catch {
      return null;
    }
  })();
  const card = body?.character?.chara_card_v2_json;
  if (res.status !== 200 || card == null)
    throw new Error(msg("ERRORS.CARD_IMPORT_FETCH_FAILED"));

  // The v2 card arrives as JSON rather than a PNG, and the loader reads either.
  const json = typeof card === "string" ? card : JSON.stringify(card);
  return toResult(Buffer.from(json, "utf8"), "application/json");
}

async function importJanitor(href: string): Promise<ImportedCard> {
  const id = UUID_RE.exec(href)?.[0].toLowerCase();
  if (!id) throw new Error(msg("ERRORS.CARD_IMPORT_INVALID_URL"));

  try {
    return await importJanitorFromJanny(id);
  } catch {
    // Janny is the canonical source and still serves proxy-enabled bots, so it
    // stays first; datacat only rescues what it refuses.
    return await importJanitorViaDatacat(id);
  }
}

async function importJanitorFromJanny(id: string): Promise<ImportedCard> {
  const api = await safeFetchRaw(`${JANNY_API_BASE}/download`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ characterId: id }),
    maxBytes: 64 * 1024,
  });
  if (api.status === 401)
    throw new Error(msg("ERRORS.CARD_IMPORT_INVALID_URL"));

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
  if (!(
    api.status === 200 &&
    json?.status === "ok" &&
    typeof json.downloadUrl === "string"
  )) {
    if (json?.status === "error") {
      throw new Error(msg("ERRORS.CARD_IMPORT_NOT_FOUND"));
    }
    throw new Error(msg("ERRORS.CARD_IMPORT_FETCH_FAILED"));
  }

  const png = await safeFetchBytes(json.downloadUrl, MAX_CARD_BYTES);
  return toResult(png.buffer, png.contentType);
}

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

async function importRisu(href: string): Promise<ImportedCard> {
  const id = UUID_RE.exec(href)?.[0].toLowerCase();
  if (!id) throw new Error(msg("ERRORS.CARD_IMPORT_INVALID_URL"));
  const png = await safeFetchBytes(
    `${RISU_REALM_BASE}/png-v3/${id}?non_commercial=true`,
    MAX_CARD_BYTES,
  );
  return toResult(png.buffer, png.contentType);
}

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

  const direct = await safeFetchBytes(url.href, MAX_CARD_BYTES);
  return toResult(direct.buffer, direct.contentType);
}
