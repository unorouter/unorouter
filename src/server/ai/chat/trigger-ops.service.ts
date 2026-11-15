import { parseChatML } from "@/lib/ai/chat/chatml";
import { generateEmbedding } from "./media/media-stream";
import { cosineSimilarity, errMessage } from "@/lib/utils/base";
import { logger } from "@/lib/utils/logger";
import { getProvider } from "@/server/constants";
import { generateText } from "ai";

// Must THROW, never return the error as text: the illustrator treats whatever
// comes back as the image prompt and would generate from the rejection message.
export async function runTriggerLLM(
  apiKey: string,
  model: string,
  prompt: string,
  group?: string | null,
): Promise<string> {
  const parsed = parseChatML(prompt);
  const messages = parsed ?? [{ role: "user" as const, content: prompt }];
  const provider = getProvider(apiKey, undefined, group);
  // No cap, as in the chat: the gateway applies the model's own. A reasoning
  // model thinks before it writes and glm-5.3 spends ~5k tokens on an RP reply,
  // so a fixed 4096 came back empty; a higher literal 400s on strict providers.
  const result = await generateText({
    model: provider.chatModel(model),
    messages,
    // ChatML from the client carries its system turn inline, which the SDK
    // rejects by default.
    allowSystemInMessages: true,
    maxRetries: 1,
  });
  if (!result.text) throw new Error("empty response");
  return result.text;
}

const EMBED_MODEL = "text-embedding-3-small";

// Values ordered by similarity to the source, most similar first.
export async function runTriggerSimilarity(
  apiKey: string,
  source: string,
  values: string[],
): Promise<string[]> {
  const texts = values.filter((v) => v.length > 0);
  if (texts.length === 0 || !source.trim()) return [];
  try {
    const [query, embeddings] = await Promise.all([
      generateEmbedding(apiKey, EMBED_MODEL, source),
      Promise.all(texts.map((t) => generateEmbedding(apiKey, EMBED_MODEL, t))),
    ]);
    if (query.vector.length === 0) return [];
    return texts
      .map((text, i) => ({
        text,
        score: cosineSimilarity(query.vector, embeddings[i].vector),
      }))
      .sort((a, b) => b.score - a.score)
      .map((x) => x.text);
  } catch (e) {
    logger.warn("Semantic retrieval failed; skipping", {
      context: "stream.retrieval",
      error: errMessage(e),
    });
    return [];
  }
}
