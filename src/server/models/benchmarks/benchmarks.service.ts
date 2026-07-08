import { THIRTY_DAY_CACHE } from "@/lib/config/constants";
import { logger } from "@/lib/utils/logger";
import { serverEnv } from "@/server/env";
import type {
  BenchmarksResponse,
  BenchLmResult,
  DesignArenaRow,
  LmArenaRow,
} from "@/lib/api/typebox/benchmarks";

const FETCH_TIMEOUT_MS = 12_000;

const LMARENA_RAW =
  "https://raw.githubusercontent.com/oolong-tea-2026/arena-ai-leaderboards/main/data";
const LMARENA_BOARDS = [
  "text",
  "code",
  "vision",
  "agent",
  "document",
  "search",
] as const;

const BENCHLM_URL = "https://benchlm.ai/api/data/leaderboard";

const OR_CATALOG_URL = "https://openrouter.ai/api/frontend/v1/catalog/models";
const OR_DESIGN_ARENA =
  "https://openrouter.ai/api/frontend/v1/private/design-arena-benchmarks";

const BENCHLM_CATEGORY_ORDER = [
  "coding",
  "reasoning",
  "math",
  "knowledge",
  "agentic",
  "multilingual",
  "instructionFollowing",
  "multimodalGrounded",
] as const;

async function fetchJson<T>(
  url: string,
  init?: RequestInit,
): Promise<T | null> {
  try {
    const cacheOpts = init?.cache ? {} : THIRTY_DAY_CACHE;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { "User-Agent": "unorouter-benchmarks", ...init?.headers },
      ...cacheOpts,
      ...init,
    });
    if (!res.ok) {
      logger.warn("Benchmark source fetch non-200", {
        context: "benchmarks",
        url,
        status: res.status,
      });
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    logger.warn("Benchmark source fetch failed", {
      context: "benchmarks",
      url,
      err: String(err),
    });
    return null;
  }
}

function normalizeName(raw: string): string {
  let n = raw.toLowerCase().trim();
  const slash = n.lastIndexOf("/");
  if (slash >= 0) n = n.slice(slash + 1);
  n = n
    .replace(/:free$/, "")
    .replace(/\[1m\]$/, "")
    .replace(/[\s_]+/g, "-")
    .replace(/(\d)\.(\d)/g, "$1-$2")
    .replace(/-(thinking|high|low|medium|max|xhigh|preview|exp)$/g, "")
    .replace(/-+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  return n;
}

type LmArenaBoardFile = {
  meta?: { last_updated?: string };
  models: {
    rank: number;
    model: string;
    score: number;
    ci: number;
    votes: number;
  }[];
};

async function resolveLmArena(target: string): Promise<LmArenaRow[] | null> {
  const ptr = await fetchJson<{ path: string }>(`${LMARENA_RAW}/latest.json`);
  if (!ptr?.path) return null;
  const rows: LmArenaRow[] = [];
  await Promise.all(
    LMARENA_BOARDS.map(async (board) => {
      const file = await fetchJson<LmArenaBoardFile>(
        `${LMARENA_RAW}/${ptr.path}/${board}.json`,
      );
      const hit = file?.models.find((m) => normalizeName(m.model) === target);
      if (hit)
        rows.push({
          board,
          rank: hit.rank,
          score: hit.score,
          ci: hit.ci,
          votes: hit.votes,
        });
    }),
  );
  return rows.length > 0 ? rows : null;
}

type BenchLmFile = {
  models: {
    model: string;
    overallScore: number | null;
    categoryScores: Record<string, number | null>;
  }[];
};

async function resolveBenchLm(target: string): Promise<BenchLmResult | null> {
  const file = await fetchJson<BenchLmFile>(BENCHLM_URL);
  const hit = file?.models.find((m) => normalizeName(m.model) === target);
  if (!hit) return null;
  const categories = BENCHLM_CATEGORY_ORDER.flatMap((key) => {
    const score = hit.categoryScores?.[key];
    return typeof score === "number" ? [{ key, score }] : [];
  });
  if (categories.length === 0 && hit.overallScore == null) return null;
  return { overall: hit.overallScore ?? null, categories };
}

type OrCatalogFile = { data: { slug: string; permaslug: string }[] };
type DesignArenaFile = {
  data: {
    records: {
      category: string;
      elo: number;
      win_rate: number;
      elo_percentile: number;
    }[];
  };
};

let permaslugCache: { at: number; map: Map<string, string> } | null = null;
const PERMASLUG_TTL_MS = 60 * 60 * 24 * 30 * 1000;

async function getPermaslugMap(): Promise<Map<string, string> | null> {
  if (permaslugCache && Date.now() - permaslugCache.at < PERMASLUG_TTL_MS)
    return permaslugCache.map;
  const catalog = await fetchJson<OrCatalogFile>(OR_CATALOG_URL, {
    cache: "no-store",
  });
  if (!catalog?.data) return permaslugCache?.map ?? null;
  const map = new Map<string, string>();
  for (const m of catalog.data)
    if (m.permaslug) map.set(normalizeName(m.slug), m.permaslug);
  permaslugCache = { at: Date.now(), map };
  return map;
}

async function resolveDesignArena(
  target: string,
): Promise<DesignArenaRow[] | null> {
  const permaslugMap = await getPermaslugMap();
  const permaslug = permaslugMap?.get(target);
  if (!permaslug) return null;
  const file = await fetchJson<DesignArenaFile>(
    `${OR_DESIGN_ARENA}?slug=${encodeURIComponent(permaslug)}`,
  );
  const records = file?.data?.records ?? [];
  if (records.length === 0) return null;
  return records.map((r) => ({
    category: r.category,
    elo: r.elo,
    winRate: r.win_rate,
    percentile: r.elo_percentile,
  }));
}

export async function getBenchmarks(
  modelName: string,
): Promise<BenchmarksResponse> {
  const target = normalizeName(modelName);
  const [lmarena, benchlm, designArena] = await Promise.all([
    resolveLmArena(target),
    resolveBenchLm(target),
    resolveDesignArena(target),
  ]);
  const llmStats = serverEnv.llmStatsApiKey ? null : null;
  return { lmarena, benchlm, designArena, llmStats };
}
