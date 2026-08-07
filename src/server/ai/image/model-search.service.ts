import { serverEnv } from "@/server/env";
import type {
  CatalogItem,
  CatalogSearchQuery,
} from "@/lib/validation/playground";
import { logger } from "@/lib/utils/logger";

// Runware serves one endpoint for every task type; the body is an array of tasks and the
// response is {data:[...]} or {errors:[...]}.
const RUNWARE_ENDPOINT = "https://api.runware.ai/v1";

type RunwareSearchResult = {
  air: string;
  name: string;
  version?: string;
  architecture?: string | null;
  category?: string;
  heroImage?: string | null;
  nsfwLevel?: number | null;
  positiveTriggerWords?: string;
  defaultWeight?: number;
  tags?: string[];
  downloadCount?: number;
  thumbsUpCount?: number;
};

type RunwareEnvelope = {
  data?: { results?: RunwareSearchResult[]; totalResults?: number }[];
  errors?: { code?: string; message?: string }[];
};

function requireKey(): string {
  const key = serverEnv.runwareApiKey;
  if (!key) throw new Error("runware api key is not configured");
  return key;
}

// Runware's modelSearch has been measured between 8 and 22 seconds. A 15s cap timed out more
// often than not, and the catalog then rendered empty, which read as "there are no LoRAs".
async function runwareTask<T = RunwareEnvelope>(
  task: Record<string, unknown>,
  timeoutMs = 30_000,
): Promise<T> {
  const res = await fetch(RUNWARE_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireKey()}`,
      "Content-Type": "application/json",
    },
    // taskUUID must be a hyphenated UUIDv4; Runware rejects any other shape.
    body: JSON.stringify([{ taskUUID: crypto.randomUUID(), ...task }]),
    signal: AbortSignal.timeout(timeoutMs),
  });
  return (await res.json()) as T;
}

function toCatalogItem(row: RunwareSearchResult): CatalogItem {
  return {
    id: row.air,
    air: row.air,
    name: row.name,
    architecture: row.architecture ?? null,
    category: row.category ?? "lora",
    heroImage: row.heroImage ?? null,
    // Runware applies 1 when a weight is omitted; the pickers offer the usual 0.8 starting
    // point for LoRAs since stacking several at full strength tends to overcook an image.
    defaultWeight: row.defaultWeight ?? 0.8,
    nsfwLevel: row.nsfwLevel ?? null,
    triggerWords: row.positiveTriggerWords?.trim() || null,
    // Capped because Runware returns up to ~60 tags per LoRA, which is a wall of text in a
    // picker row rather than a description. The leading ones are the descriptive ones.
    tags: (row.tags ?? []).slice(0, 8),
    downloadCount: row.downloadCount ?? null,
    thumbsUpCount: row.thumbsUpCount ?? null,
  };
}

// Runware's modelSearch answers in anywhere from 8 to 22 seconds, so a result is worth
// holding on to: the catalog is a browse list that barely changes, and without this every
// picker open pays the full latency again.
const CATALOG_TTL_MS = 30 * 60_000;

// The provider's own per-request maximum. Latency is per REQUEST rather than per result, so
// a short page costs the same 8-to-22 seconds as a full one while showing a quarter as much.
const CATALOG_PAGE_SIZE = 50;
const catalogCache = new Map<string, { at: number; items: CatalogItem[] }>();

export async function searchModelCatalog(
  category: string,
  query: CatalogSearchQuery,
): Promise<{ items: CatalogItem[] }> {
  const cacheKey = JSON.stringify([
    category,
    query.search ?? "",
    query.architecture ?? "",
    query.limit ?? CATALOG_PAGE_SIZE,
  ]);
  const hit = catalogCache.get(cacheKey);
  if (hit && Date.now() - hit.at < CATALOG_TTL_MS) return { items: hit.items };

  // These lists are optional decoration on the form: a LoRA or VAE picker that cannot load
  // should render empty, not fail the request. Runware regularly exceeds the timeout here,
  // and a 500 made the whole page look broken while the user was only trying to generate.
  let envelope: RunwareEnvelope;
  try {
    envelope = await runwareTask({
      taskType: "modelSearch",
      category,
      ...(query.search ? { search: query.search } : {}),
      ...(query.architecture ? { architecture: query.architecture } : {}),
      limit: query.limit ?? CATALOG_PAGE_SIZE,
    });
    // The provider matches whole tokens against model NAMES only, so a word that is a
    // substring rather than a prefix finds nothing: "face" returns zero while "faces"
    // returns results, and "detailer" zero while "Face Detailer" works. Retry the same word
    // as a TAG, which is where that vocabulary actually lives, before reporting no results.
    if (query.search && !(envelope.data?.[0]?.results ?? []).length) {
      const byTag = await runwareTask({
        taskType: "modelSearch",
        category,
        tags: [query.search.toLowerCase()],
        ...(query.architecture ? { architecture: query.architecture } : {}),
        limit: query.limit ?? CATALOG_PAGE_SIZE,
      });
      if ((byTag.data?.[0]?.results ?? []).length) envelope = byTag;
    }
  } catch (err) {
    logger.warn("runware model search unreachable", {
      context: "image.catalog",
      category,
      error: String(err),
    });
    // Stale beats empty: an expired entry is a real list, and returning nothing is what made
    // the LoRA picker look like it had no models at all.
    return { items: hit?.items ?? [] };
  }

  if (envelope.errors?.length) {
    logger.warn("runware model search failed", {
      context: "image.catalog",
      category,
      error: envelope.errors[0]?.message,
    });
    return { items: hit?.items ?? [] };
  }

  const results = envelope.data?.[0]?.results ?? [];
  const items = results.map(toCatalogItem);
  // Only a REAL list is worth holding. Caching an empty one pinned "no models" for the whole
  // TTL after a single bad response, which is exactly how the picker looked broken before.
  if (items.length) catalogCache.set(cacheKey, { at: Date.now(), items });
  return { items };
}

export type ResolvedCheckpoint = {
  air: string;
  name: string;
  architecture: string | null;
  heroImage: string | null;
  nsfwLevel: number | null;
  // Meaningful for LoRAs only (a checkpoint has neither), but the resolve path is shared and
  // the picker needs both the moment a LoRA is what got resolved.
  triggerWords: string | null;
  defaultWeight: number | null;
};

// Every way a user might name a checkpoint. A reference identifies one specific model, so it
// resolves to that; anything else is treated as a name to search for.
//   civitai.com/models/288584/autismmix-sdxl?modelVersionId=324619
//   288584
//   civitai:288584@324619
//   urn:air:sdxl:checkpoint:civitai:288584@324619
function parseCivitaiReference(input: string): {
  modelId: string;
  versionId?: string;
} | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (/^\d+$/.test(trimmed)) return { modelId: trimmed };

  // A full URN carries the AIR at its tail, so read that rather than the prefix.
  const air = trimmed.match(/(?:^|:)([a-z]+):(\d+)@(\d+)$/i);
  if (air?.[2] && air[3]) return { modelId: air[2], versionId: air[3] };

  const url = trimmed.match(/civitai\.com\/models\/(\d+)/i);
  if (!url?.[1]) return null;
  const version = trimmed.match(/[?&]modelVersionId=(\d+)/i);
  return {
    modelId: url[1],
    ...(version?.[1] ? { versionId: version[1] } : {}),
  };
}

export function looksLikeCheckpointReference(input: string): boolean {
  return parseCivitaiReference(input) != null;
}

/**
 * Resolves a user-supplied Civitai reference to a checkpoint Runware can actually load.
 *
 * Resolution goes through Runware's own catalog rather than Civitai's API on purpose:
 * Runware pins its own version ids, so a Civitai-sourced AIR is frequently rejected as
 * invalidModel. Even a listed model can fail to load (Pony V6 XL only loads under the
 * `runware:` publisher prefix, not `civitai:`), which is why the caller should treat a
 * successful resolve as necessary but not sufficient and surface honest failure copy.
 */
/**
 * One entry point for everything a user can type into the model search: a Civitai URL, a bare
 * id, an AIR, or a plain name. A reference names one model so it resolves to that one; a name
 * searches the provider's catalog, which is far larger than any list shipped in config.
 */
export async function findCheckpoints(
  input: string,
): Promise<ResolvedCheckpoint[]> {
  const trimmed = input.trim();
  if (trimmed.length < 2) return [];

  if (looksLikeCheckpointReference(trimmed)) {
    const resolved = await resolveCivitaiCheckpoint(trimmed);
    return resolved ? [resolved] : [];
  }

  const envelope = await runwareTask({
    taskType: "modelSearch",
    category: "checkpoint",
    search: trimmed,
    limit: 20,
  });
  const results = envelope.data?.[0]?.results ?? [];
  return results
    .filter((row) => !!row.air)
    .map((row) => ({
      air: row.air,
      name: row.name,
      architecture: row.architecture ?? null,
      heroImage: row.heroImage ?? null,
      nsfwLevel: row.nsfwLevel ?? null,
      triggerWords: row.positiveTriggerWords?.trim() || null,
      defaultWeight: row.defaultWeight ?? null,
    }));
}

/**
 * Every version of the model a reference points at, best match first.
 *
 * A Civitai model is usually a family: LUSTIFY alone has eleven versions on the provider,
 * across alpha, lightning and DMD2 variants that generate quite differently. Picking one
 * silently hides that, so the caller gets the list and the user chooses.
 */
export async function listCheckpointVersions(
  input: string,
  category: "checkpoint" | "lora" = "checkpoint",
): Promise<ResolvedCheckpoint[]> {
  const ref = parseCivitaiReference(input);
  if (!ref) return [];

  const envelope = await runwareTask({
    taskType: "modelSearch",
    category,
    search: ref.modelId,
    limit: 50,
  });
  const results = envelope.data?.[0]?.results ?? [];
  const versions = results.filter((row) =>
    row.air?.includes(`:${ref.modelId}@`),
  );
  if (!versions.length) return [];

  const toCheckpoint = (row: RunwareSearchResult): ResolvedCheckpoint => ({
    air: row.air,
    name: row.version ? `${row.name} (${row.version})` : row.name,
    architecture: row.architecture ?? null,
    heroImage: row.heroImage ?? null,
    nsfwLevel: row.nsfwLevel ?? null,
    triggerWords: row.positiveTriggerWords?.trim() || null,
    defaultWeight: row.defaultWeight ?? null,
  });

  // The version named in the URL leads, since that is the one the user was looking at.
  const exactIndex = ref.versionId
    ? versions.findIndex((row) => row.air?.endsWith(`@${ref.versionId}`))
    : -1;
  if (exactIndex > 0) {
    const [exact] = versions.splice(exactIndex, 1);
    if (exact) versions.unshift(exact);
  }
  return versions.map(toCheckpoint);
}

export async function resolveCivitaiCheckpoint(
  input: string,
  category: "checkpoint" | "lora" = "checkpoint",
): Promise<ResolvedCheckpoint | null> {
  const ref = parseCivitaiReference(input);
  if (!ref) return null;

  const envelope = await runwareTask({
    taskType: "modelSearch",
    category,
    search: ref.modelId,
    limit: 50,
  });
  const results = envelope.data?.[0]?.results ?? [];
  if (!results.length) return null;

  const matches = results.filter((row) =>
    row.air?.includes(`:${ref.modelId}@`),
  );
  const pool = matches.length ? matches : results;
  const exact = ref.versionId
    ? pool.find((row) => row.air?.endsWith(`@${ref.versionId}`))
    : undefined;
  const picked = exact ?? pool[0];
  if (!picked?.air) return null;

  return {
    air: picked.air,
    name: picked.name,
    architecture: picked.architecture ?? null,
    heroImage: picked.heroImage ?? null,
    nsfwLevel: picked.nsfwLevel ?? null,
    triggerWords: picked.positiveTriggerWords?.trim() || null,
    defaultWeight: picked.defaultWeight ?? null,
  };
}
