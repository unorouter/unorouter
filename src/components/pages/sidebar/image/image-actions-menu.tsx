"use client";

import { AppearanceSubmenu } from "@/components/pages/sidebar/chat/chat-actions-menu/appearance-submenu";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { clearChatDebugLog } from "@/lib/utils/chat-debug-log";
import { dayjs } from "@/lib/utils/format/date";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { useState } from "react";
import { toast } from "sonner";

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

  const downloadDiagnostics = async () => {
    try {
      const stamp = dayjs().format("YYYYMMDD-HHmmss");
      const { downloadDiagnostics: runDownloadDiagnostics } =
        await import("@/lib/db/client/data/diagnostics/db-export");
      await runDownloadDiagnostics(`unorouter-diagnostics-${stamp}.json`);
    } catch (e) {
      toast.error(String(e).slice(0, 120));
    }
  };

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
          <DropdownMenuItem onClick={downloadDiagnostics}>
            <Icon name="clipboard-copy" className="size-4" />
            {t("CHAT.MORE.DIAGNOSTICS")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              clearChatDebugLog();
              toast.success(t("CHAT.MORE.DEBUG_CLEARED"));
            }}
          >
            <Icon name="trash-2" className="size-4" />
            {t("CHAT.MORE.DEBUG_CLEAR")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {themeOpen && (
        <ThemeCustomizerSheet open={themeOpen} onOpenChange={setThemeOpen} />
      )}
    </>
  );
}
