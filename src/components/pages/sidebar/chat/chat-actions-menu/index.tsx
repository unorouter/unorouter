"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import { conversationSettingsOpenAtom } from "@/store/chat-store";
import { useAtom } from "jotai";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { useState } from "react";
import { AppearanceSubmenu } from "./appearance-submenu";
import { RpNavItems } from "./rp-nav-items";
import { RequestLogListSheet } from "../request-log/request-log-list-sheet";
import { ToolsSubmenu } from "./tools-submenu";

type Props = {
  convId: string | null;
};

const ConversationOverridesDrawer = dynamic(
  () =>
    import("@/components/pages/sidebar/chat/overrides").then(
      (m) => m.ConversationOverridesDrawer,
    ),
  { ssr: false },
);
const ThemeCustomizerSheet = dynamic(
  () =>
    import("@/components/ui/theme/customizer-sheet").then(
      (m) => m.ThemeCustomizerSheet,
    ),
  { ssr: false },
);

export function ChatActionsMenu(props: Props) {
  const t = useTranslations();
  const [themeOpen, setThemeOpen] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useAtom(conversationSettingsOpenAtom);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
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
          <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
            <Icon name="settings-2" className="size-4" />
            {t("CHAT.OVERRIDES.OPEN")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {/* Library: priority, flat + top-level. */}
          <RpNavItems />
          <DropdownMenuSeparator />
          {/* Everything else grouped: look-and-feel + utilities. */}
          <AppearanceSubmenu onOpenCustomizer={() => setThemeOpen(true)} />
          <ToolsSubmenu
            convId={props.convId}
            onOpenRequestLogs={() => setLogsOpen(true)}
          />
        </DropdownMenuContent>
      </DropdownMenu>
      {settingsOpen && (
        <ConversationOverridesDrawer
          convId={props.convId}
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
        />
      )}
      {themeOpen && (
        <ThemeCustomizerSheet open={themeOpen} onOpenChange={setThemeOpen} />
      )}
      {logsOpen && props.convId && (
        <RequestLogListSheet
          convId={props.convId}
          open={logsOpen}
          onOpenChange={setLogsOpen}
        />
      )}
    </>
  );
}
