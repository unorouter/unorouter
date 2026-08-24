import type { CatalogItem, CatalogSearchQuery } from "@/lib/validation/image";
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
  capabilities?: string[];
};

// A Runware LoRA TRAINING model answers the same checkpoint search but only
// accepts `train` tasks, so picking one guarantees a failed generation.
const NON_GENERATIVE_CAPABILITIES = new Set(["train"]);

function canGenerate(row: RunwareSearchResult): boolean {
  const caps = row.capabilities;
  if (!caps || caps.length === 0) return true;
  return !caps.every((c) => NON_GENERATIVE_CAPABILITIES.has(c));
}

type SearchPage = { results?: RunwareSearchResult[]; totalResults?: number };
type RunwareEnvelope = { data?: SearchPage[]; errors?: RunwareErrors };

// modelSearch answers in 8-22s measured; a 15s cap timed out more often than not.
const SEARCH_TIMEOUT_MS = 30_000;

function searchTask(task: Record<string, unknown>): Promise<RunwareEnvelope> {
  return runwareTask<SearchPage>(task, SEARCH_TIMEOUT_MS);
}

function logSearchError(envelope: RunwareEnvelope, context: string): void {
  logger.warn("runware model search failed", {
    context: "image.catalog",
    search: context,
    error: envelope.errors?.[0]?.message,
  });
}

function searchRows(
  envelope: RunwareEnvelope,
  context: string,
): RunwareSearchResult[] {
  if (envelope.errors?.length) {
    logSearchError(envelope, context);
    return [];
  }
  return envelope.data?.[0]?.results ?? [];
}

function toCatalogItem(row: RunwareSearchResult): CatalogItem {
  return {
    id: row.air,
    air: row.air,
    name: row.name,
    architecture: row.architecture ?? null,
    heroImage: row.heroImage ?? null,
    defaultWeight: row.defaultWeight ?? 0.8,
    nsfwLevel: row.nsfwLevel ?? null,
    triggerWords: row.positiveTriggerWords?.trim() || null,
    tags: (row.tags ?? []).slice(0, 8),
    downloadCount: row.downloadCount ?? null,
  };
}

const CATALOG_TTL_MS = 30 * 60_000;

// Provider's per-request max.
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

  let envelope: RunwareEnvelope;
  try {
    envelope = await searchTask({
      taskType: "modelSearch",
      category,
      ...(query.search ? { search: query.search } : {}),
      ...(query.architecture ? { architecture: query.architecture } : {}),
      limit: query.limit ?? CATALOG_PAGE_SIZE,
    });
    // Name search matches whole tokens only ("face" finds nothing, "faces" does).
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
    return { items: hit?.items ?? [] };
  }

  if (envelope.errors?.length) {
    logSearchError(envelope, category);
    return { items: hit?.items ?? [] };
  }

  const items = searchRows(envelope, category)
    .filter(canGenerate)
    .map(toCatalogItem);
  // Never cache empty: one bad response pins "no models" for the whole TTL.
  if (items.length) catalogCache.set(cacheKey, { at: Date.now(), items });
  return { items };
}

export type ResolvedCheckpoint = {
  air: string;
  name: string;
  architecture: string | null;
  heroImage: string | null;
  nsfwLevel: number | null;
  triggerWords: string | null;
  defaultWeight: number | null;
};

// Accepted forms:
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

async function searchByReference(ref: Ref, category: "checkpoint" | "lora") {
  const envelope = await searchTask({
    taskType: "modelSearch",
    category,
    search: ref.modelId,
    limit: 50,
  });
  const results = searchRows(envelope, `ref:${ref.modelId}`);
  return {
    results,
    family: results.filter((row) => row.air?.includes(`:${ref.modelId}@`)),
  };
}

async function resolveRef(
  ref: Ref,
  category: "checkpoint" | "lora",
): Promise<ResolvedCheckpoint | null> {
  const found = await searchByReference(ref, category);
  if (!found.results.length) return null;
  const pool = found.family.length ? found.family : found.results;
  const exact = ref.versionId
    ? pool.find((row) => row.air?.endsWith(`@${ref.versionId}`))
    : undefined;
  const picked = exact ?? pool[0];
  return picked?.air ? toResolved(picked) : null;
}

export async function findCheckpoints(
  input: string,
): Promise<ResolvedCheckpoint[]> {
  const trimmed = input.trim();
  if (trimmed.length < 2) return [];

  const ref = parseCivitaiReference(trimmed);
  if (ref) {
    const resolved = await resolveRef(ref, "checkpoint");
    return resolved ? [resolved] : [];
  }

  const envelope = await searchTask({
    taskType: "modelSearch",
    category: "checkpoint",
    search: trimmed,
    limit: 20,
  });
  return searchRows(envelope, trimmed)
    .filter((row) => !!row.air)
    .map((row) => toResolved(row));
}

export async function listCheckpointVersions(
  input: string,
  category: "checkpoint" | "lora" = "checkpoint",
): Promise<ResolvedCheckpoint[]> {
  const ref = parseCivitaiReference(input);
  if (!ref) return [];

  const versions = (await searchByReference(ref, category)).family;
  if (!versions.length) return [];

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
  return ref ? resolveRef(ref, category) : null;
}
