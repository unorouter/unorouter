"use client";

import { OwnPurposeObjectionToggle } from "@/components/elements/model/own-purpose-objection-toggle";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import { Link } from "@/i18n/navigation";
import {
  conversationSettingsOpenAtom,
  focusMemoryFieldAtom,
} from "@/store/chat-store";
import { useAtom, useSetAtom } from "jotai";
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
    import("@/components/elements/theme/customizer-sheet").then(
      (m) => m.ThemeCustomizerSheet,
    ),
  { ssr: false },
);

export function ChatActionsMenu(props: Props) {
  const t = useTranslations();
  const [themeOpen, setThemeOpen] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const [consentsOpen, setConsentsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useAtom(conversationSettingsOpenAtom);
  const setFocusMemory = useSetAtom(focusMemoryFieldAtom);

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
          {props.convId && (
            <DropdownMenuItem
              onClick={() => {
                setFocusMemory(true);
                setSettingsOpen(true);
              }}
            >
              <Icon name="scroll-text" className="size-4" />
              {t("CHAT.MORE.AUTHOR_NOTE")}
            </DropdownMenuItem>
          )}
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
          <DropdownMenuSeparator />
          {/* Guests have no settings page, so revoking lives here too. */}
          <DropdownMenuItem onClick={() => setConsentsOpen(true)}>
            <Icon name="shield-check" className="size-4" />
            {t("CONSENT.MANAGE")}
          </DropdownMenuItem>
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
      <Dialog open={consentsOpen} onOpenChange={setConsentsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("CONSENT.SETTINGS_TITLE")}</DialogTitle>
            <DialogDescription>
              <Link
                href="/consents"
                className="text-primary text-sm underline-offset-4 hover:underline"
              >
                {t("CONSENT.MANAGE")}
              </Link>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 border-t pt-4">
            <h3 className="text-foreground text-sm font-medium">
              {t("OWN_PURPOSE.TITLE")}
            </h3>
            <OwnPurposeObjectionToggle />
          </div>
        </DialogContent>
      </Dialog>
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
