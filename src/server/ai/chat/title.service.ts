import {
  TITLE_FALLBACK_MAX_CHARS,
  UTILITY_RACE_MODELS,
  TITLE_SYSTEM_PROMPT,
} from "@/lib/config/constants";
import { stripThinkForDisplay } from "@/lib/ai/chat/think-tags";
import { logger } from "@/lib/utils/logger";
import { getProvider } from "@/server/constants";
import { serverEnv } from "@/server/env";
import { generateText } from "ai";

function truncateToTitle(text: string): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  if (collapsed.length <= TITLE_FALLBACK_MAX_CHARS) return collapsed;
  const slice = collapsed.slice(0, TITLE_FALLBACK_MAX_CHARS);
  const lastSpace = slice.lastIndexOf(" ");
  const trimmed = lastSpace > 20 ? slice.slice(0, lastSpace) : slice;
  return `${trimmed.trimEnd()}...`;
}

function stripThinkFromTitle(text: string): string {
  return stripThinkForDisplay(text).trim();
}

export async function generateChatTitle(
  apiKey: string,
  text: string,
  _preferredModel?: string,
) {
  const provider = getProvider(apiKey ?? serverEnv.guestApiKey);
  const attempts = UTILITY_RACE_MODELS.map((modelName) =>
    generateText({
      model: provider.chatModel(modelName),
      system: TITLE_SYSTEM_PROMPT,
      prompt: text,
      maxOutputTokens: 200,
      maxRetries: 0,
    }),
  );

  let title: string;
  try {
    const result = await Promise.any(attempts);
    title = stripThinkFromTitle(result.text) || truncateToTitle(text);
  } catch (err) {
    logger.warn("Title generation race failed, using truncated fallback", {
      context: "title.generate",
      error: String(err),
    });
    title = truncateToTitle(text);
  }

  return { title };
}
