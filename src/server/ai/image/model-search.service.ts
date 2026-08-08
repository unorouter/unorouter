import type {
  CatalogItem,
  CatalogSearchQuery,
} from "@/lib/validation/playground";
import { logger } from "@/lib/utils/logger";
import { runwareTask, type RunwareErrors } from "./runware";

type RunwareSearchResult = {
  air: string;
  name: string;
  version?: string;
  architecture?: string | null;
  heroImage?: string | null;
  nsfwLevel?: number | null;
  positiveTriggerWords?: string;
  defaultWeight?: number;
  tags?: string[];
  downloadCount?: number;
};

type SearchPage = { results?: RunwareSearchResult[]; totalResults?: number };
type RunwareEnvelope = { data?: SearchPage[]; errors?: RunwareErrors };

// modelSearch answers in 8-22s measured; a 15s cap timed out more often than not.
const SEARCH_TIMEOUT_MS = 30_000;

function searchTask(task: Record<string, unknown>): Promise<RunwareEnvelope> {
  return runwareTask<SearchPage>(task, SEARCH_TIMEOUT_MS);
}

function toCatalogItem(row: RunwareSearchResult): CatalogItem {
  return {
    id: row.air,
    air: row.air,
    name: row.name,
    architecture: row.architecture ?? null,
    heroImage: row.heroImage ?? null,
    // 0.8 starting weight: stacking several LoRAs at full strength overcooks an image.
    defaultWeight: row.defaultWeight ?? 0.8,
    nsfwLevel: row.nsfwLevel ?? null,
    triggerWords: row.positiveTriggerWords?.trim() || null,
    // Runware returns up to ~60 tags; only the leading ones are descriptive.
    tags: (row.tags ?? []).slice(0, 8),
    downloadCount: row.downloadCount ?? null,
  };
}

const CATALOG_TTL_MS = 30 * 60_000;

// Provider's per-request max; latency is per request, so ask for the full page.
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

  // Catalog lists are decoration: a picker that cannot load renders empty, never 500s.
  let envelope: RunwareEnvelope;
  try {
    envelope = await searchTask({
      taskType: "modelSearch",
      category,
      ...(query.search ? { search: query.search } : {}),
      ...(query.architecture ? { architecture: query.architecture } : {}),
      limit: query.limit ?? CATALOG_PAGE_SIZE,
    });
    // Name search matches whole tokens only ("face" finds nothing, "faces" does); retry
    // the word as a tag before reporting no results.
    if (query.search && !(envelope.data?.[0]?.results ?? []).length) {
      const byTag = await searchTask({
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
    // Stale beats empty.
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
  // Never cache an empty list: one bad response would pin "no models" for the whole TTL.
  if (items.length) catalogCache.set(cacheKey, { at: Date.now(), items });
  return { items };
}

export type ResolvedCheckpoint = {
  air: string;
  name: string;
  architecture: string | null;
  heroImage: string | null;
  nsfwLevel: number | null;
  // LoRA-only fields; the resolve path is shared between categories.
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

function toResolved(
  row: RunwareSearchResult,
  opts: { versionSuffix?: boolean } = {},
): ResolvedCheckpoint {
  return {
    air: row.air,
    name:
      opts.versionSuffix && row.version
        ? `${row.name} (${row.version})`
        : row.name,
    architecture: row.architecture ?? null,
    heroImage: row.heroImage ?? null,
    nsfwLevel: row.nsfwLevel ?? null,
    triggerWords: row.positiveTriggerWords?.trim() || null,
    defaultWeight: row.defaultWeight ?? null,
  };
}

type Ref = NonNullable<ReturnType<typeof parseCivitaiReference>>;

// One provider search per reference; the model-id filter narrows to the family the
// reference names.
async function searchByReference(ref: Ref, category: "checkpoint" | "lora") {
  const envelope = await searchTask({
    taskType: "modelSearch",
    category,
    search: ref.modelId,
    limit: 50,
  });
  const results = envelope.data?.[0]?.results ?? [];
  return {
    results,
    family: results.filter((row) => row.air?.includes(`:${ref.modelId}@`)),
  };
}

/**
 * One entry point for everything a user can type into the model search: a Civitai URL,
 * a bare id, an AIR, or a plain name. A reference resolves to its one model; a name
 * searches the provider catalog. Resolution goes through Runware's catalog, not
 * Civitai's API: Runware pins its own version ids, and a resolve succeeding is
 * necessary but not sufficient (some models still fail to load at generation time).
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

  const envelope = await searchTask({
    taskType: "modelSearch",
    category: "checkpoint",
    search: trimmed,
    limit: 20,
  });
  const results = envelope.data?.[0]?.results ?? [];
  return results.filter((row) => !!row.air).map((row) => toResolved(row));
}

/**
 * Every version of the model a reference points at, best match first. A Civitai model is
 * a family whose variants generate differently, so the user chooses.
 */
export async function listCheckpointVersions(
  input: string,
  category: "checkpoint" | "lora" = "checkpoint",
): Promise<ResolvedCheckpoint[]> {
  const ref = parseCivitaiReference(input);
  if (!ref) return [];

  const versions = (await searchByReference(ref, category)).family;
  if (!versions.length) return [];

  // The version named in the URL leads, since that is the one the user was looking at.
  const exactIndex = ref.versionId
    ? versions.findIndex((row) => row.air?.endsWith(`@${ref.versionId}`))
    : -1;
  if (exactIndex > 0) {
    const [exact] = versions.splice(exactIndex, 1);
    if (exact) versions.unshift(exact);
  }
  return versions.map((row) => toResolved(row, { versionSuffix: true }));
}

export async function resolveCivitaiCheckpoint(
  input: string,
  category: "checkpoint" | "lora" = "checkpoint",
): Promise<ResolvedCheckpoint | null> {
  const ref = parseCivitaiReference(input);
  if (!ref) return null;

  const found = await searchByReference(ref, category);
  if (!found.results.length) return null;

  const pool = found.family.length ? found.family : found.results;
  const exact = ref.versionId
    ? pool.find((row) => row.air?.endsWith(`@${ref.versionId}`))
    : undefined;
  const picked = exact ?? pool[0];
  if (!picked?.air) return null;
  return toResolved(picked);
}
