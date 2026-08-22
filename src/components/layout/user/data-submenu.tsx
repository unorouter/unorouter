"use client";

import { DatabaseSubmenu } from "@/components/pages/sidebar/chat/chat-actions-menu/database-submenu";
import { DebugLogItems } from "@/components/pages/sidebar/chat/chat-actions-menu/debug-log-items";
import {
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import { useTranslations } from "next-intl";

export function DataSubmenu() {
  const t = useTranslations();
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Icon name="database" className="size-4" />
        {t("CHAT.MORE.DATA")}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DatabaseSubmenu />
        <DropdownMenuSeparator />
        <DebugLogItems />
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
