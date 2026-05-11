"use client";

import { LoginLink } from "@/components/elements/auth/login-link";
import { DocsSearch } from "@/components/layout/docs/docs-search";
import type { SidebarNavConfig } from "@/components/layout/sidebar/app-sidebar";
import { UserAvatar } from "@/components/layout/user/user-avatar";
import { UserDropdown } from "@/components/layout/user/user-dropdown";
import {
    ChatControls,
    ChatShareSlot,
} from "@/components/pages/sidebar/chat/chat-elements";
import { LanguageToggle } from "@/components/toggle/language-toggle";
import { ThemeToggle } from "@/components/toggle/theme-toggle";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useUserDisplay } from "@/hooks/ui/user-display-hook";
import { useTranslations } from "next-intl";
import { LuLogIn } from "react-icons/lu";

interface SidebarHeaderProps {
  showSearch?: boolean;
  navConfig?: SidebarNavConfig;
}

export function SidebarHeader(props: SidebarHeaderProps) {
  const t = useTranslations();
  const userDisplay = useUserDisplay();
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
          <div className="hidden items-center gap-2 md:flex">
            <LanguageToggle />
            <ThemeToggle />
          </div>
          {props.navConfig === "chat" && <ChatShareSlot />}
          {userDisplay.user ? (
            <UserDropdown side="bottom" align="end">
              <button
                aria-label={t("COMMON.OPEN_MENU")}
                className="hover:bg-accent cursor-pointer rounded-md p-1 transition-colors"
              >
                <UserAvatar />
              </button>
            </UserDropdown>
          ) : (
            <LoginLink
              aria-label={t("NAV.LOG_IN")}
              className="hover:bg-accent rounded-md p-1 transition-colors"
            >
              <LuLogIn className="size-5" />
            </LoginLink>
          )}
        </div>
      </div>
    </header>
  );
}
