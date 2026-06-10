// Semantic retrieval (RisuAI hypa "past events" analog). Embeds the recent
// chat text and a set of candidate texts (lorebook entries and/or summarized
// chunks) via the upstream /v1/embeddings endpoint, cosine-ranks them, and
// returns the top-K. Used to surface relevant lore that plain keyword matching
// missed. Best-effort: any embedding failure yields an empty result (the prompt
// is still assembled without it).

import { generateEmbedding } from "../stream/media-stream";
import { logger } from "@/lib/utils/logger";

const DEFAULT_EMBED_MODEL = "text-embedding-3-small";

function cosine(a: number[], b: number[]): number {
  if (a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export type RetrievalCandidate = { id: string; text: string };

export async function retrieveSemantic(
  apiKey: string,
  queryText: string,
  candidates: RetrievalCandidate[],
  opts: { topK?: number; model?: string; minScore?: number } = {},
): Promise<RetrievalCandidate[]> {
  const topK = opts.topK ?? 3;
  const model = opts.model ?? DEFAULT_EMBED_MODEL;
  const minScore = opts.minScore ?? 0.2;
  if (!queryText.trim() || candidates.length === 0) return [];

  try {
    // Embed the query and every candidate (concurrently).
    const [queryEmb, candEmbs] = await Promise.all([
      generateEmbedding(apiKey, model, queryText),
      Promise.all(
        candidates.map((c) => generateEmbedding(apiKey, model, c.text)),
      ),
    ]);
    if (queryEmb.vector.length === 0) return [];

    const scored = candidates
      .map((c, i) => ({
        c,
        score: cosine(queryEmb.vector, candEmbs[i].vector),
      }))
      .filter((x) => x.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    logger.debug("Semantic retrieval", {
      context: "stream.retrieval",
      candidates: candidates.length,
      returned: scored.length,
    });
    return scored.map((x) => x.c);
  } catch (e) {
    logger.warn("Semantic retrieval failed; skipping", {
      context: "stream.retrieval",
      error: e instanceof Error ? e.message : String(e),
    });
    return [];
  }
}
