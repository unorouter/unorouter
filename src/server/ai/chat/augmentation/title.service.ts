import { freeModelRace } from "@/lib/ai/chat/free-model-race";
import {
  TITLE_FALLBACK_MAX_CHARS,
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

// Free reasoning models can spend the whole 30-token budget inside an unclosed
// <think> block; the raw output then becomes the visible conversation title.
// Strip closed blocks and everything from an unclosed opening tag onward.
function stripThinkFromTitle(text: string): string {
  let t = text.replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/gi, "");
  const openIdx = t.search(/<think(?:ing)?>/i);
  if (openIdx !== -1) t = t.slice(0, openIdx);
  return t.trim();
}

// Stateless: takes user text + optional preferred model, returns `{ title }`.
// Client persists to SQLocal. No DB read, no DB write.
export async function generateChatTitle(
  apiKey: string,
  text: string,
  preferredModel?: string,
) {
  let title: string;
  try {
    if (preferredModel) {
      const provider = getProvider(apiKey ?? serverEnv.guestApiKey);
      const result = await generateText({
        model: provider.chatModel(preferredModel),
        system: TITLE_SYSTEM_PROMPT,
        prompt: text,
        maxOutputTokens: 30,
        maxRetries: 0,
      });
      title = stripThinkFromTitle(result.text) || truncateToTitle(text);
    } else {
      const result = await freeModelRace({
        apiKey,
        systemPrompt: TITLE_SYSTEM_PROMPT,
        prompt: text,
        maxOutputTokens: 30,
      });
      title = stripThinkFromTitle(result.text) || truncateToTitle(text);
    }
  } catch (err) {
    logger.warn("Title generation race failed, using truncated fallback", {
      context: "title.generate",
      error: String(err),
    });
    title = truncateToTitle(text);
  }

  return { title };
}
