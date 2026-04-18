"use client";

import { ModelSelector } from "@/components/elements/chat/model-selector";
import { ShareButton } from "@/components/elements/chat/share-button";
import { useApiKey } from "@/hooks/ui/use-api-key";
import { Link } from "@/i18n/navigation";
import { chatModelAtom } from "@/store/chat-store";
import { useAui, useAuiState } from "@assistant-ui/react";
import { useAtom } from "jotai";
import { useTranslations } from "next-intl";
import { LuKey, LuLoader, LuPlus, LuWallet } from "react-icons/lu";
import { Button } from "../../ui/button";

export function ChatControls() {
  const t = useTranslations();
  const [chatModel, setNewChatModel] = useAtom(chatModelAtom);
  const aui = useAui();

  const handleNewChat = () => {
    aui.threads().switchToNewThread();
  };

  return (
    <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
      <div className="w-40 min-w-0 sm:w-48 lg:w-52">
        <ModelSelector value={chatModel} onChange={setNewChatModel} />
      </div>
      <Button
        size="sm"
        className="h-8 shrink-0 lg:px-3"
        onClick={handleNewChat}
        aria-label={t("CHAT.NEW_CONVERSATION")}
      >
        <LuPlus className="h-3.5 w-3.5 lg:mr-1.5" />
        <span className="hidden lg:inline">{t("CHAT.NEW_CONVERSATION")}</span>
      </Button>
    </div>
  );
}

export function ChatShareSlot() {
  const token = useApiKey();
  const threadId = useAuiState((s) => s.threadListItem?.remoteId);
  if (!threadId || !token.isLoggedIn) return null;
  return <ShareButton convId={threadId} />;
}

export function NeedsTokenGate() {
  const t = useTranslations();
  const token = useApiKey();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <div className="bg-muted flex h-16 w-16 items-center justify-center rounded-full">
        <LuKey className="text-muted-foreground h-8 w-8" />
      </div>
      <div className="text-center">
        <h2 className="text-foreground text-lg font-medium">
          {t("CHAT.GATE.NEEDS_TOKEN_TITLE")}
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {t("CHAT.GATE.NEEDS_TOKEN_DESC")}
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

export function ZeroBalanceGate() {
  const t = useTranslations();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <div className="bg-muted flex h-16 w-16 items-center justify-center rounded-full">
        <LuWallet className="text-muted-foreground h-8 w-8" />
      </div>
      <div className="text-center">
        <h2 className="text-foreground text-lg font-medium">
          {t("CHAT.GATE.ZERO_BALANCE_TITLE")}
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {t("CHAT.GATE.ZERO_BALANCE_DESC")}
        </p>
      </div>
      <Button
        size="sm"
        className="gap-1.5"
        nativeButton={false}
        render={<Link href="/billing" />}
      >
        <LuWallet className="h-3.5 w-3.5" />
        {t("CHAT.GATE.GO_TO_BILLING")}
      </Button>
    </div>
  );
}
