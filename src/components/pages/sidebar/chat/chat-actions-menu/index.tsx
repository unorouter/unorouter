"use client";

import dynamic from "next/dynamic";
// Both panels are action-gated; their module graphs (overrides form pulls the
// TypeBox validation schemas, the studio pulls @libsqlstudio/gui) must load on
// first open, not with the chat shell.
const ConversationOverridesDrawer = dynamic(
  () =>
    import("@/components/pages/sidebar/chat/overrides").then(
      (m) => m.ConversationOverridesDrawer,
    ),
  { ssr: false },
);
const LocalDbStudio = dynamic(
  () =>
    import("@/components/elements/db/local-db-studio").then(
      (m) => m.LocalDbStudio,
    ),
  { ssr: false },
);
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import { useAuthQuery } from "@/hooks/auth/auth-hook";
import { conversationSettingsOpenAtom } from "@/store/chat-store";
import { useAtom } from "jotai";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ConversationMenuItems } from "./conversation-menu-items";
import { ImportExportSubmenu } from "./import-export-submenu";
import { RpNavItems } from "./rp-nav-items";
import { SyncMenuItems } from "./sync-menu-items";

type Props = {
  convId: string | null;
};

export function ChatActionsMenu(props: Props) {
  const t = useTranslations();
  const auth = useAuthQuery();
  const [dbStudioOpen, setDbStudioOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useAtom(conversationSettingsOpenAtom);

  const isLoggedIn = !!auth.data;

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
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
            <Icon name="settings-2" className="size-4" />
            {t("CHAT.OVERRIDES.OPEN")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <RpNavItems />
          <DropdownMenuSeparator />
          <SyncMenuItems convId={props.convId} isLoggedIn={isLoggedIn} />
          <ImportExportSubmenu convId={props.convId} />
          <DropdownMenuSeparator />
          <ConversationMenuItems
            convId={props.convId}
            onOpenDbStudio={() => setDbStudioOpen(true)}
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
      {dbStudioOpen && (
        <LocalDbStudio open={dbStudioOpen} onOpenChange={setDbStudioOpen} />
      )}
    </>
  );
}
