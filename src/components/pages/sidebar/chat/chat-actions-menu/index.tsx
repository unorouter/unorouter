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
import { ConversationMenuItems } from "./conversation-menu-items";
import { DisplaySettingsSubmenu } from "./display-settings-submenu";
import { ImportExportSubmenu } from "./import-export-submenu";
import { RpNavItems } from "./rp-nav-items";

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
const LocalDbStudio = dynamic(
  () =>
    import("@/components/elements/db/local-db-studio").then(
      (m) => m.LocalDbStudio,
    ),
  { ssr: false },
);

export function ChatActionsMenu(props: Props) {
  const t = useTranslations();
  const [dbStudioOpen, setDbStudioOpen] = useState(false);
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
          <RpNavItems />
          <DropdownMenuSeparator />
          <DisplaySettingsSubmenu />
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
