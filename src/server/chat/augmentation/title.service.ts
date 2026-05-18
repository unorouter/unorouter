import {
  FREE_MODEL_RACE_COUNT,
  TITLE_SYSTEM_PROMPT,
} from "@/lib/config/constants";
import { logger } from "@/lib/utils/logger";
import { getProvider } from "@/server/constants";
import { serverEnv } from "@/server/env";
import { generateText } from "ai";
import { getFreeTextModels } from "@/lib/api/pricing-cache";

const TITLE_FALLBACK_MAX_CHARS = 60;

function truncateToTitle(text: string): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  if (collapsed.length <= TITLE_FALLBACK_MAX_CHARS) return collapsed;
  const slice = collapsed.slice(0, TITLE_FALLBACK_MAX_CHARS);
  const lastSpace = slice.lastIndexOf(" ");
  const trimmed = lastSpace > 20 ? slice.slice(0, lastSpace) : slice;
  return `${trimmed.trimEnd()}...`;
}

// Stateless: takes user text + optional preferred model, returns `{ title }`.
// Client persists to SQLocal. No DB read, no DB write.
export async function generateChatTitle(
  apiKey: string,
  text: string,
  preferredModel?: string,
) {
  const provider = getProvider(apiKey ?? serverEnv.guestApiKey);

  let title: string;
  const models = preferredModel
    ? [preferredModel]
    : await getFreeTextModels(FREE_MODEL_RACE_COUNT);
  if (models.length === 0) {
    title = truncateToTitle(text);
  } else {
    try {
      const attempts = models.map((modelName) =>
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
        attempted: models,
        error: String(err),
      });
      title = truncateToTitle(text);
    }
  }

  return { title };
}
