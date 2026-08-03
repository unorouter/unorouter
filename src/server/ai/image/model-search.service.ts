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

async function runwareTask<T = RunwareEnvelope>(
  task: Record<string, unknown>,
  timeoutMs = 15_000,
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
  };
}

export async function searchModelCatalog(
  category: string,
  query: CatalogSearchQuery,
): Promise<{ items: CatalogItem[] }> {
  // These lists are optional decoration on the form: a LoRA or VAE picker that cannot load
  // should render empty, not fail the request. Runware regularly exceeds the timeout here,
  // and a 500 made the whole page look broken while the user was only trying to generate.
  let envelope: RunwareEnvelope;
  try {
    envelope = await runwareTask(
      {
        taskType: "modelSearch",
        category,
        ...(query.search ? { search: query.search } : {}),
        ...(query.architecture ? { architecture: query.architecture } : {}),
        limit: query.limit ?? 24,
      },
      // Shorter than the resolver's: an empty picker is a small loss, while a page that
      // hangs for fifteen seconds on every load is the thing being reported.
      7_000,
    );
  } catch (err) {
    logger.warn("runware model search unreachable", {
      context: "image.catalog",
      category,
      error: String(err),
    });
    return { items: [] };
  }

  if (envelope.errors?.length) {
    logger.warn("runware model search failed", {
      context: "image.catalog",
      category,
      error: envelope.errors[0]?.message,
    });
    return { items: [] };
  }

  const results = envelope.data?.[0]?.results ?? [];
  return { items: results.map(toCatalogItem) };
}

export type ResolvedCheckpoint = {
  air: string;
  name: string;
  architecture: string | null;
  heroImage: string | null;
  nsfwLevel: number | null;
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
): Promise<ResolvedCheckpoint[]> {
  const ref = parseCivitaiReference(input);
  if (!ref) return [];

  const envelope = await runwareTask({
    taskType: "modelSearch",
    category: "checkpoint",
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
): Promise<ResolvedCheckpoint | null> {
  const ref = parseCivitaiReference(input);
  if (!ref) return null;

  const envelope = await runwareTask({
    taskType: "modelSearch",
    category: "checkpoint",
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
  };
}
