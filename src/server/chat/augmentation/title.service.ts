import {
  FREE_MODEL_RACE_COUNT,
  msg,
  TITLE_SYSTEM_PROMPT,
} from "@/lib/config/constants";
import { getDb } from "@/lib/db/client";
import { conversations } from "@/lib/db/schema";
import { logger } from "@/lib/utils/logger";
import { getProvider } from "@/server/constants";
import { serverEnv } from "@/server/env";
import { generateText } from "ai";
import { and, eq } from "drizzle-orm";
import { getFreeTextModels } from "@/lib/api/pricing-cache";

const TITLE_FALLBACK_MAX_CHARS = 60;

/** Trim user text to a short, single-line title at a word boundary. */
function truncateToTitle(text: string): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  if (collapsed.length <= TITLE_FALLBACK_MAX_CHARS) return collapsed;
  const slice = collapsed.slice(0, TITLE_FALLBACK_MAX_CHARS);
  const lastSpace = slice.lastIndexOf(" ");
  const trimmed = lastSpace > 20 ? slice.slice(0, lastSpace) : slice;
  return `${trimmed.trimEnd()}...`;
}

export async function generateChatTitle(
  apiKey: string,
  userId: number,
  convId: string,
  text: string,
) {
  const db = getDb();
  const conv = await db.query.conversations.findFirst({
    where: and(eq(conversations.id, convId), eq(conversations.userId, userId)),
  });
  if (!conv) throw new Error(msg("ERRORS.NOT_FOUND"));

  const provider = getProvider(serverEnv.guestApiKey ?? apiKey);

  // Race up to 3 free models in parallel and take the first successful response.
  // Free models can be flaky (rate limits, channel exhaustion); racing them keeps
  // titles fast without burning paid quota for a 30-token request.
  let title: string;
  const freeModels = await getFreeTextModels(FREE_MODEL_RACE_COUNT);
  if (freeModels.length === 0) {
    title = truncateToTitle(text);
  } else {
    try {
      const attempts = freeModels.map((modelName) =>
        generateText({
          model: provider.chatModel(modelName),
          system: TITLE_SYSTEM_PROMPT,
          prompt: text,
          maxOutputTokens: 30,
          maxRetries: 0,
        }),
      );
      const result = await Promise.any(attempts);
      title = result.text.trim() || truncateToTitle(text);
    } catch (err) {
      logger.warn("Title generation race failed, using truncated fallback", {
        context: "title.generate",
        convId,
        attempted: freeModels,
        error: String(err),
      });
      title = truncateToTitle(text);
    }
  }

  await db
    .update(conversations)
    .set({ title })
    .where(eq(conversations.id, convId));

  return { title };
}
