"use client";

import { ModelSelector } from "@/components/pages/chat/model-selector";
import { Button } from "@/components/ui/button";
import { useUserDisplay } from "@/hooks/ui/user-display-hook";
import { useRouter } from "@/i18n/navigation";
import {
  newChatModelAtom,
  selectedConversationAtom,
} from "@/store/client-store";
import { useAtom, useSetAtom } from "jotai";
import { useTranslations } from "next-intl";
import { LuPlus } from "react-icons/lu";

export function ChatControls() {
  const t = useTranslations();
  const router = useRouter();
  const userDisplay = useUserDisplay();
  const [newChatModel, setNewChatModel] = useAtom(newChatModelAtom);
  const setSelectedId = useSetAtom(selectedConversationAtom);

  const handleNewChat = () => {
    if (!userDisplay.user) {
      router.push("/login");
      return;
    }
    setSelectedId(null);
  };

  return (
    <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
      <div className="w-40 min-w-0 sm:w-48 lg:w-52">
        <ModelSelector value={newChatModel} onChange={setNewChatModel} />
      </div>
      <Button
        size="sm"
        className="h-8 shrink-0 lg:px-3"
        onClick={handleNewChat}
      >
        <LuPlus className="h-3.5 w-3.5 lg:mr-1.5" />
        <span className="hidden lg:inline">{t("CHAT.NEW_CONVERSATION")}</span>
      </Button>
    </div>
  );
}
