"use client";

import { DocsSearch } from "@/components/layout/docs/docs-search";
import type { SidebarNavConfig } from "@/components/layout/sidebar/app-sidebar";
import { UserAvatar } from "@/components/layout/user/user-avatar";
import { UserDropdown } from "@/components/layout/user/user-dropdown";
import { ModelSelector } from "@/components/pages/chat/model-selector";
import { LanguageToggle } from "@/components/toggle/language-toggle";
import { ThemeToggle } from "@/components/toggle/theme-toggle";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  useConversationsQuery,
  useCreateConversationMutation,
} from "@/hooks/chat-hook";
import { useUserDisplay } from "@/hooks/ui/user-display-hook";
import { Link } from "@/i18n/navigation";
import {
  newChatModelAtom,
  selectedConversationAtom,
} from "@/store/client-store";
import { useAtom, useSetAtom } from "jotai";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { LuLogIn, LuPlus } from "react-icons/lu";

interface SidebarHeaderProps {
  showSearch?: boolean;
  navConfig?: SidebarNavConfig;
}

function ChatControls() {
  const t = useTranslations();
  const [newChatModel, setNewChatModel] = useAtom(newChatModelAtom);
  const setSelectedId = useSetAtom(selectedConversationAtom);
  const createMutation = useCreateConversationMutation();

  const handleNewChat = () => {
    if (!newChatModel) return;
    createMutation.mutate(
      { body: { model: newChatModel } },
      {
        onSuccess: (data) => {
          setSelectedId(data.id);
        },
      },
    );
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
        disabled={createMutation.isPending || !newChatModel}
      >
        <LuPlus className="h-3.5 w-3.5 lg:mr-1.5" />
        <span className="hidden lg:inline">{t("CHAT.NEW_CONVERSATION")}</span>
      </Button>
    </div>
  );
}

export function SidebarHeader(props: SidebarHeaderProps) {
  const userDisplay = useUserDisplay();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <header className="bg-background sticky top-0 z-20 flex h-12 shrink-0 items-center border-b transition-[width,height] ease-linear">
      <div className="flex h-full w-full items-center gap-1.5 px-2 sm:gap-2 sm:px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-1 h-8 self-auto! sm:mx-2"
        />
        {props.showSearch && (
          <div className="max-w-56 min-w-0 flex-1">
            <DocsSearch />
          </div>
        )}
        {props.navConfig === "chat" && <ChatControls />}
        <div className="ml-auto flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
          {mounted &&
            (userDisplay.user ? (
              <UserDropdown side="bottom" align="end">
                <button className="hover:bg-accent cursor-pointer rounded-md p-1 transition-colors">
                  <UserAvatar />
                </button>
              </UserDropdown>
            ) : (
              <Link
                href="/login"
                className="hover:bg-accent rounded-md p-1 transition-colors"
              >
                <LuLogIn className="size-5" />
              </Link>
            ))}
        </div>
      </div>
    </header>
  );
}
