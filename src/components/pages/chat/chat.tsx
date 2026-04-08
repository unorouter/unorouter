"use client";

import { Thread } from "@/components/assistant-ui/thread";
import { ShareButton } from "@/components/elements/chat/share-button";
import { useConversationQuery } from "@/hooks/chat-hook";
import { useApiKey } from "@/hooks/ui/use-api-key";
import { APP_VALUES } from "@/lib/config/constants";
import { formatPrice } from "@/lib/utils/base";
import { useAuiState } from "@assistant-ui/react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { LuKey, LuLoader, LuPlus } from "react-icons/lu";
import { Button } from "../../ui/button";

type ChatProps = {
  readOnly?: boolean;
  convId?: string;
};

export function Chat(props: ChatProps) {
  const t = useTranslations();
  const locale = useLocale();
  const token = useApiKey();
  const threadId = useAuiState((s) => s.threadListItem?.remoteId);
  const effectiveId = props.convId ?? threadId;
  const convQuery = useConversationQuery(effectiveId);
  const skipFirstSync = useRef(true);

  useEffect(() => {
    if (props.readOnly) return;
    if (skipFirstSync.current) {
      skipFirstSync.current = false;
      return;
    }
    const url = threadId ? `/${locale}/chat/${threadId}` : `/${locale}/chat`;
    window.history.replaceState(null, "", url);
  }, [props.readOnly, threadId, locale]);

  // Update document title since shallow history update skips generateMetadata
  useEffect(() => {
    if (props.readOnly) return;
    const convTitle = convQuery.data?.title;
    document.title = convTitle
      ? t("CHAT.META.TITLE_WITH_NAME", { ...APP_VALUES, title: convTitle })
      : t("CHAT.META.TITLE", APP_VALUES);
  }, [props.readOnly, convQuery.data?.title]);

  // Logged-in users who need to create an API token
  if (!props.readOnly && token.isLoggedIn && token.needsToken) {
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
      {effectiveId && (
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
          {!props.readOnly && token.isLoggedIn && (
            <ShareButton convId={effectiveId} />
          )}
        </div>
      )}
      <Thread readOnly={props.readOnly} />
    </div>
  );
}
