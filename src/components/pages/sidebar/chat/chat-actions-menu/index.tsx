"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import {
  conversationSettingsOpenAtom,
  showStatsCostAtom,
  showStatsTokensAtom,
} from "@/store/chat-store";
import { useAtom } from "jotai";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { useState } from "react";
import { ConversationMenuItems } from "./conversation-menu-items";
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
  const [showCost, setShowCost] = useAtom(showStatsCostAtom);
  const [showTokens, setShowTokens] = useAtom(showStatsTokensAtom);

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
          <div className="text-muted-foreground px-2 py-1.5 text-xs font-medium">
            {t("CHAT.CHAT_TOTAL")}
          </div>
          <DropdownMenuCheckboxItem
            checked={showCost}
            onCheckedChange={setShowCost}
            closeOnClick={false}
          >
            {t("CHAT.STATS.SHOW_COST")}
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={showTokens}
            onCheckedChange={setShowTokens}
            closeOnClick={false}
          >
            {t("CHAT.STATS.SHOW_TOKENS")}
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          <RpNavItems />
          <DropdownMenuSeparator />
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
