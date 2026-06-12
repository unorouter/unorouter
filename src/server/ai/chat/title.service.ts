import { freeModelRace } from "@/lib/ai/chat/free-model-race";
import { isMediaModel } from "@/lib/api/pricing-cache";
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

// Reasoning models can burn the 30-token budget inside an unclosed <think>
// block that would become the visible title; strip closed blocks and anything
// after an unclosed opening tag.
function stripThinkFromTitle(text: string): string {
  let t = text.replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/gi, "");
  const openIdx = t.search(/<think(?:ing)?>/i);
  if (openIdx !== -1) t = t.slice(0, openIdx);
  return t.trim();
}

// Stateless; client persists. No DB read or write.
export async function generateChatTitle(
  apiKey: string,
  text: string,
  preferredModel?: string,
) {
  // The active chat model rides along as preferredModel, but it can be an
  // image/video model (can't do text title gen); fall through to the free
  // text race in that case.
  const usableModel =
    preferredModel && !(await isMediaModel(preferredModel)).mediaType
      ? preferredModel
      : undefined;

  let title: string;
  try {
    if (usableModel) {
      const provider = getProvider(apiKey ?? serverEnv.guestApiKey);
      const result = await generateText({
        model: provider.chatModel(usableModel),
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
