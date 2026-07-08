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

  const effectiveWebSearch =
    userId !== GUEST_USER_ID &&
    (!!body.webSearch || (convCtx?.settings.webSearchEnabled ?? false));

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
