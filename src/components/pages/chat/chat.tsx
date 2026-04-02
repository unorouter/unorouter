"use client";

import { useApiKey } from "@/hooks/ui/use-api-key";
import { Link } from "@/i18n/navigation";
import { selectedConversationAtom } from "@/store/client-store";
import { useAtomValue } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import { useLocale, useTranslations } from "next-intl";
import { useEffect } from "react";
import { LuKey, LuLoader, LuLogIn, LuPlus } from "react-icons/lu";
import { Button } from "../../ui/button";
import { ChatThread } from "./thread/chat-thread";

export function Chat(props: { initialConvId?: string }) {
  useHydrateAtoms([[selectedConversationAtom, props.initialConvId ?? null]]);
  
  const t = useTranslations();
  const locale = useLocale();

  const selectedId = useAtomValue(selectedConversationAtom);
  const token = useApiKey();

  // Keep URL in sync with selected conversation
  useEffect(() => {
    const target = selectedId
      ? `/${locale}/chat/${selectedId}`
      : `/${locale}/chat`;
    if (window.location.pathname !== target) {
      window.history.replaceState(null, "", target);
    }
  }, [selectedId, locale]);

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
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <ChatThread convId={selectedId} />
    </div>
  );
}
