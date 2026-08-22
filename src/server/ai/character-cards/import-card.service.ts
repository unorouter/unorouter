import { msg } from "@/lib/config/constants";
import { serverEnv } from "@/server/env";

// Every source is fetched by uno-import, not here. These sites answer this
// cluster's IP with a Cloudflare challenge that no API client can solve, and
// datacat additionally sends no CORS header, so neither the gateway nor the
// browser can reach them: uno-import drives a real browser behind a rotating
// VPN exit and is the only path that works.
const BASE = serverEnv.unoImportUrl;
const TOKEN = serverEnv.unoImportToken;

// Kept in step with uno-import's own allowlist: a host missing here is
// rejected before the job is ever submitted, which reads as an invalid link
// rather than an unsupported site.
const SUPPORTED =
  /(^|\.)(datacat\.run|janitorai\.com|janitor\.ai|jannyai\.com|chub\.ai|characterhub\.org|realm\.risuai\.net|lorebary\.com|saucepan\.ai|botbooru\.com|character-tavern\.com)$/i;

export type ImportJob = { jobId: string; status: string };

export type ImportedLorebook = {
  name: string;
  scanDepth?: number;
  entries: Array<Record<string, unknown>>;
};

export type ImportedCard = {
  source: string;
  sourceUrl: string;
  card: { spec: string; data: Record<string, unknown> };
  lorebooks: ImportedLorebook[];
  // Lorebooks the source lists but will not hand over, carried by title so the
  // UI can name what is missing instead of silently importing fewer books.
  skipped: Array<{ title: string; reason: "private" | "not_found" }>;
};

export type ImportStatus = {
  status: "queued" | "running" | "done" | "failed";
  result: ImportedCard | null;
  error: string | null;
};

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      ...init?.headers,
      authorization: `Bearer ${TOKEN}`,
      "content-type": "application/json",
    },
  });
  if (!res.ok) throw new Error(msg("ERRORS.CARD_IMPORT_FETCH_FAILED"));
  return (await res.json()) as T;
}

export async function submitImport(
  input: string,
  userId: string,
): Promise<ImportJob> {
  const trimmed = input.trim();
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error(msg("ERRORS.CARD_IMPORT_INVALID_URL"));
  }
  if (url.protocol !== "https:" || !SUPPORTED.test(url.hostname)) {
    throw new Error(msg("ERRORS.CARD_IMPORT_INVALID_URL"));
  }
  return call<ImportJob>("/api/jobs", {
    method: "POST",
    body: JSON.stringify({ url: url.href, userId }),
  });
}

export const getImportStatus = (jobId: string) =>
  call<ImportStatus>(`/api/jobs/${encodeURIComponent(jobId)}`);
