import { parseChatML } from "@/lib/ai/chat/chatml";
import { generateEmbedding } from "./media/media-stream";
import { cosineSimilarity, errMessage } from "@/lib/utils/base";
import { logger } from "@/lib/utils/logger";
import { getProvider } from "@/server/constants";
import { generateText } from "ai";

const TRIGGER_LLM_MAX_TOKENS = 1024;

// THROWS on failure. This is shared by the Lua trigger VM and the illustrator,
// and they need opposite things from an upstream rejection: the VM wants a
// string a script can inspect (it formats its own "Error: ..." around this
// call), while the illustrator treats whatever comes back as the image prompt.
// Returning the message as text made the illustrator generate from it, so a
// model that rejected the request put "Error: Invalid prompt: System messages
// are not allowed..." into the review dialog as if the model had written it.
export async function runTriggerLLM(
  apiKey: string,
  model: string,
  prompt: string,
): Promise<string> {
  const parsed = parseChatML(prompt);
  const messages = parsed ?? [{ role: "user" as const, content: prompt }];
  const provider = getProvider(apiKey);
  const result = await generateText({
    model: provider.chatModel(model),
    messages,
    maxOutputTokens: TRIGGER_LLM_MAX_TOKENS,
    maxRetries: 1,
  });
  if (!result.text) throw new Error("empty response");
  return result.text;
}

export async function runTriggerSimilarity(
  apiKey: string,
  source: string,
  values: string[],
): Promise<string[]> {
  const candidates = values
    .filter((v) => v.length > 0)
    .map((text, i) => ({ id: String(i), text }));
  if (candidates.length === 0) return [];
  const hits = await retrieveSemantic(apiKey, source, candidates, {
    topK: candidates.length,
    minScore: -1,
  });
  return hits.map((h) => h.text);
}

const DEFAULT_EMBED_MODEL = "text-embedding-3-small";

type RetrievalCandidate = { id: string; text: string };

async function retrieveSemantic(
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
