import { generateEmbedding } from "../media/media-stream";
import { logger } from "@/lib/utils/logger";
import { cosineSimilarity, errMessage } from "@/lib/utils/base";

const DEFAULT_EMBED_MODEL = "text-embedding-3-small";

type RetrievalCandidate = { id: string; text: string };

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
        score: cosineSimilarity(queryEmb.vector, candEmbs[i].vector),
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
      error: errMessage(e),
    });
    return [];
  }
}
