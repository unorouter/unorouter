import {
  TITLE_FALLBACK_MAX_CHARS,
  TITLE_MODELS,
  TITLE_SYSTEM_PROMPT,
} from "@/lib/config/constants";
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

// Reasoning models can spend the budget inside a <think> block that becomes the title; strip closed blocks and anything after an unclosed open tag.
function stripThinkFromTitle(text: string): string {
  let t = text.replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/gi, "");
  const openIdx = t.search(/<think(?:ing)?>/i);
  if (openIdx !== -1) t = t.slice(0, openIdx);
  return t.trim();
}

// Stateless; client persists. preferredModel ignored: pinned TITLE_MODELS keep titles language-stable.
export async function generateChatTitle(
  apiKey: string,
  text: string,
  _preferredModel?: string,
) {
  const provider = getProvider(apiKey ?? serverEnv.guestApiKey);
  // Budget room for a short think block + the title; stripThinkFromTitle removes the reasoning.
  const attempts = TITLE_MODELS.map((modelName) =>
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
