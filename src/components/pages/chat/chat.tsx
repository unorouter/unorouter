"use client";

import { Thread } from "@/components/assistant-ui/thread";
import { ShareButton } from "@/components/elements/chat/share-button";
import {
  useConversationQuery,
  useMessagesInfiniteQuery,
} from "@/hooks/chat-hook";
import { useApiKey } from "@/hooks/ui/use-api-key";
import { Link } from "@/i18n/navigation";
import { formatPrice } from "@/lib/utils/base";
import { useAuiState } from "@assistant-ui/react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { LuKey, LuLoader, LuLogIn, LuPlus } from "react-icons/lu";
import { Button } from "../../ui/button";

export function Chat() {
  const t = useTranslations();
  const locale = useLocale();
  const token = useApiKey();
  const threadId = useAuiState((s) => s.threadListItem.remoteId);
  const messagesQuery = useMessagesInfiniteQuery(threadId);
  const convQuery = useConversationQuery(threadId);
  const skipFirstSync = useRef(true);

  // Keep URL in sync with active thread via shallow update (no server re-render)
  useEffect(() => {
    if (skipFirstSync.current) {
      skipFirstSync.current = false;
      return;
    }
    const url = threadId ? `/${locale}/chat/${threadId}` : `/${locale}/chat`;
    window.history.replaceState(null, "", url);
  }, [threadId, locale]);

  if (!token.isLoggedIn) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <div className="bg-muted flex h-16 w-16 items-center justify-center rounded-full">
          <LuLogIn className="text-muted-foreground h-8 w-8" />
        </div>
        <div className="text-center">
          <p className="text-muted-foreground mt-1 text-sm">
            {t("CHAT.LOGIN_REQUIRED_DESC")}
          </p>
        </div>
        <Link href="/login">
          <Button size="sm" className="gap-1.5">
            <LuLogIn className="h-3.5 w-3.5" />
            {t("AUTH.LOGIN_BUTTON")}
          </Button>
        </Link>
      </div>
    );
  }

  if (token.needsToken) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <div className="bg-muted flex h-16 w-16 items-center justify-center rounded-full">
          <LuKey className="text-muted-foreground h-8 w-8" />
        </div>
        <div className="text-center">
          <h2 className="text-foreground text-lg font-medium">
            {t("CHAT.NEEDS_TOKEN_TITLE")}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("CHAT.NEEDS_TOKEN_DESC")}
          </p>
        </div>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={token.createToken}
          disabled={token.isLoading}
        >
          {token.isLoading ? (
            <LuLoader className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <LuPlus className="h-3.5 w-3.5" />
          )}
          {t("DOCS.GENERATE_API_KEY")}
        </Button>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
      {threadId && (
        <div className="absolute top-2 right-4 z-10 flex items-center gap-3">
          {convQuery.data &&
            (convQuery.data.totalInputTokens > 0 ||
              convQuery.data.totalOutputTokens > 0) && (
              <div className="text-muted-foreground flex items-center gap-2 text-[11px] tabular-nums">
                <span>
                  {convQuery.data.totalInputTokens.toLocaleString()}{" "}
                  {t("CHAT.TOKENS_IN")}
                </span>
                <span>
                  {convQuery.data.totalOutputTokens.toLocaleString()}{" "}
                  {t("CHAT.TOKENS_OUT")}
                </span>
                {convQuery.data.totalCost > 0 && (
                  <span className="text-foreground/70 font-medium">
                    {formatPrice(convQuery.data.totalCost)}
                  </span>
                )}
              </div>
            )}
          <ShareButton convId={threadId} />
        </div>
      )}
      <Thread
        onScrollTop={() => {
          if (messagesQuery.hasNextPage && !messagesQuery.isFetchingNextPage) {
            messagesQuery.fetchNextPage();
          }
        }}
      />
    </div>
  );
}
