import { GUEST_USER_ID } from "@/lib/config/constants";
import type { LoadedConvContext } from "@/lib/types";
import type { AssemblerDeps } from "../deps";
import { extractLastUserText, type StreamMessages } from "../transforms";

type ResolvedContext = {
  convCtx: LoadedConvContext | null;
  searchSystemMessage: string | undefined;
};

export async function resolveContext(
  apiKey: string,
  body: {
    convId?: string | null;
    chatContext?: LoadedConvContext;
    webSearch?: boolean;
    messages: StreamMessages;
  },
  userId: number,
  deps: AssemblerDeps,
): Promise<ResolvedContext> {
  const convCtx = body.chatContext ?? null;

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

  return { convCtx, searchSystemMessage };
}
