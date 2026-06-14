    // Stage 1: resolve the conversation context + run web search. Client context (or cached hash, 409 on stale) wins; Turso is the guest/legacy fallback.

import { GUEST_USER_ID } from "@/lib/config/constants";
import { captureServerEvent } from "@/lib/posthog-server";
import { logger } from "@/lib/utils/logger";
import type { ChatContext } from "@/lib/validation/chat";
import type { LoadedConvContext } from "@/lib/types";
import {
  buildContextFromClient,
  loadConvContext,
} from "../../prompt/conv-context";
import {
  formatSearchContext,
  needsWebSearch,
  searchTavily,
} from "../../context/web-search.service";
import { resolveContextPayload } from "../context-cache";
import { extractLastUserText, type StreamMessages } from "../transforms";

export type ResolvedContext = {
  clientCtx: ChatContext | undefined;
  convCtx: LoadedConvContext;
  effectiveWebSearch: boolean;
  searchSystemMessage: string | undefined;
};

export async function resolveContext(
  apiKey: string,
  body: {
    convId?: string | null;
    chatContext?: ChatContext;
    chatContextHash?: string;
    webSearch?: boolean;
    messages: StreamMessages;
  },
  request: Request,
  userId: number,
): Promise<ResolvedContext> {
  const clientCtx = resolveContextPayload(body);
  const convCtx = clientCtx
    ? buildContextFromClient(clientCtx)
    : body.convId
      ? await loadConvContext(userId, body.convId)
      : null;

  // Toolbar toggle OR'd with conv default; web search paid-only so guests off.
  const effectiveWebSearch =
    userId !== GUEST_USER_ID &&
    (!!body.webSearch || (convCtx?.settings.webSearchEnabled ?? false));

  let searchSystemMessage: string | undefined;
  if (effectiveWebSearch) {
    const lastUserText = extractLastUserText(body.messages);
    if (lastUserText && (await needsWebSearch(apiKey, lastUserText))) {
      const engine = convCtx?.settings.webSearchEngine ?? "auto";
      const contextSize = convCtx?.settings.webSearchContextSize ?? "medium";
      logger.info("Web search triggered", {
        context: "stream.search",
        query: lastUserText.slice(0, 100),
        engine,
        contextSize,
      });
      const searchResult = await searchTavily(lastUserText);
      captureServerEvent({
        event: "chat_web_search_executed",
        request,
        userId,
        properties: {
          engine,
          context_size: contextSize,
          result_count: searchResult?.results.length ?? 0,
          had_results: (searchResult?.results.length ?? 0) > 0,
        },
      });
      if (searchResult && searchResult.results.length > 0) {
        searchSystemMessage = formatSearchContext(searchResult);
      }
    }
  }

  return { clientCtx, convCtx, effectiveWebSearch, searchSystemMessage };
}
