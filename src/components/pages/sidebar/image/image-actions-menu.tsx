"use client";

import { AppearanceSubmenu } from "@/components/pages/sidebar/chat/chat-actions-menu/appearance-submenu";
import { DatabaseSubmenu } from "@/components/pages/sidebar/chat/chat-actions-menu/database-submenu";
import { DebugLogItems } from "@/components/pages/sidebar/chat/chat-actions-menu/debug-log-items";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { useState } from "react";

// Chat's three-dot menu, minus everything that needs a conversation.
const ThemeCustomizerSheet = dynamic(
  () =>
    import("@/components/ui/theme/customizer-sheet").then(
      (m) => m.ThemeCustomizerSheet,
    ),
  { ssr: false },
);

export function ImageActionsMenu() {
  const t = useTranslations();
  const [themeOpen, setThemeOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("CHAT.MORE.OPEN")}
              title={t("CHAT.MORE.OPEN")}
            />
          }
        >
          <Icon name="ellipsis-vertical" className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-64 max-w-[calc(100vw-1rem)]"
        >
          <AppearanceSubmenu onOpenCustomizer={() => setThemeOpen(true)} />
          <DropdownMenuSeparator />
          <DatabaseSubmenu />
          <DropdownMenuSeparator />
          <DebugLogItems />
        </DropdownMenuContent>
      </DropdownMenu>
      {themeOpen && (
        <ThemeCustomizerSheet open={themeOpen} onOpenChange={setThemeOpen} />
      )}
    </>
  );
}
