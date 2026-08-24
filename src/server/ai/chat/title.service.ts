import {
  TITLE_FALLBACK_MAX_CHARS,
  TITLE_SYSTEM_PROMPT,
} from "@/lib/config/constants";
import { freeModelRace } from "@/lib/ai/chat/free-model-race";
import { stripThinkForDisplay } from "@/lib/ai/chat/think-tags";
import { logger } from "@/lib/utils/logger";
import { serverFreeModelRaceDeps } from "@/server/ai/chat/free-model-race.service";

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
  text: string,
  opts?: { titleModel?: string; titleGroup?: string; titlePrompt?: string },
) {
  const titleModel = opts?.titleModel?.trim();
  // A lane belongs to the model it was pinned for, so it may only ship when that
  // model actually races. Passing it with the free trio would stamp a lane those
  // models do not serve, and the gateway would silently fall back to auto.
  const deps = serverFreeModelRaceDeps(
    apiKey,
    titleModel ? opts?.titleGroup : null,
  );
  try {
    // Think-tags are stripped because an unclosed <think> would become the
    // visible title.
    const race = await freeModelRace({
      systemPrompt: opts?.titlePrompt?.trim() || TITLE_SYSTEM_PROMPT,
      prompt: text,
      maxOutputTokens: 200,
      ...deps,
      // A chosen model races alone, which reuses the same generate path rather
      // than adding a second one. Empty keeps the free trio, so titles stay
      // free for everyone who never sets this.
      ...(titleModel ? { listFreeModels: async () => [titleModel] } : {}),
    });
    return {
      title: stripThinkForDisplay(race.text).trim() || truncateToTitle(text),
    };
  } catch (err) {
    logger.warn("Title generation failed, using truncated fallback", {
      context: "title.generate",
      error: String(err),
      ...(titleModel ? { model: titleModel } : {}),
    });
    return { title: truncateToTitle(text) };
  }
}
