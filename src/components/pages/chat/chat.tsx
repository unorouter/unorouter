"use client";

import { useApiKey } from "@/hooks/ui/use-api-key";
import { Link, useRouter } from "@/i18n/navigation";
import { useAui, useAuiState } from "@assistant-ui/react";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { LuKey, LuLoader, LuLogIn, LuPlus } from "react-icons/lu";
import { Thread } from "@/components/assistant-ui/thread";
import { ShareButton } from "@/components/elements/chat/share-button";
import { useMessagesInfiniteQuery } from "@/hooks/chat-hook";
import { Button } from "../../ui/button";

export function Chat(props: { initialConvId?: string }) {
  const t = useTranslations();
  const router = useRouter();
  const token = useApiKey();
  const aui = useAui();

  // Switch to initial conversation if navigated directly to /chat/[convId]
  const initializedRef = useRef(false);
  useEffect(() => {
    if (props.initialConvId && !initializedRef.current) {
      initializedRef.current = true;
      aui.threads().switchToThread(props.initialConvId);
    }
  }, [props.initialConvId, aui]);

  // Keep URL in sync with active thread
  const threadId = useAuiState((s) => s.threadListItem.remoteId);
  const messagesQuery = useMessagesInfiniteQuery(threadId);
  useEffect(() => {
    if (threadId) {
      router.replace({
        pathname: "/chat/[convId]",
        params: { convId: threadId },
      });
    } else {
      router.replace("/chat");
    }
  }, [threadId, router]);

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
        <div className="absolute top-2 right-4 z-10">
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
