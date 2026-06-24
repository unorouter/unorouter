// Stage 1: resolve the conversation context + run web search. The client always supplies the full context
// (the engine runs in the browser), so there is no server cache / hash dedup / Turso fallback anymore.

import { GUEST_USER_ID } from "@/lib/config/constants";
import type { ChatContext } from "@/lib/validation/chat";
import type { LoadedConvContext } from "@/lib/types";
import { buildContextFromClient } from "../../prompt/conv-context";
import type { AssemblerDeps } from "../deps";
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
    webSearch?: boolean;
    messages: StreamMessages;
  },
  userId: number,
  deps: AssemblerDeps,
): Promise<ResolvedContext> {
  const clientCtx = body.chatContext;
  const convCtx = clientCtx ? buildContextFromClient(clientCtx) : null;

  // Toolbar toggle OR'd with conv default; web search paid-only so guests off.
  const effectiveWebSearch =
    userId !== GUEST_USER_ID &&
    (!!body.webSearch || (convCtx?.settings.webSearchEnabled ?? false));

  // Web search execution + telemetry live in deps.webSearch (server: Tavily; client: disabled).
  let searchSystemMessage: string | undefined;
  if (effectiveWebSearch) {
    const lastUserText = extractLastUserText(body.messages);
    searchSystemMessage = await deps.webSearch({
      apiKey,
      lastUserText,
      settings: convCtx?.settings,
    });
  }

  return { clientCtx, convCtx, effectiveWebSearch, searchSystemMessage };
}
