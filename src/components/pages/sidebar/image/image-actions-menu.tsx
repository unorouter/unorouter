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
import { useLocalUserId } from "@/hooks/auth/use-local-user-id";
import { clearChatDebugLog } from "@/lib/utils/chat-debug-log";
import { dayjs } from "@/lib/utils/format/date";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { useState } from "react";
import { toast } from "sonner";

// Same three-dot entry point chat has, minus everything that needs a conversation. Without
// it this route had no way to reach diagnostics or the theme, so an image-gen report could
// not carry the debug log that makes it actionable.
const LocalDbStudio = dynamic(
  () =>
    import("@/components/elements/db/local-db-studio").then(
      (m) => m.LocalDbStudio,
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

export function ImageActionsMenu() {
  const t = useTranslations();
  const userId = useLocalUserId();
  const [dbStudioOpen, setDbStudioOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);

  const downloadDiagnostics = async (includeContent: boolean) => {
    try {
      const stamp = dayjs().format("YYYYMMDD-HHmmss");
      const { downloadDiagnostics: runDownloadDiagnostics } =
        await import("@/lib/db/client/data/diagnostics/db-export");
      await runDownloadDiagnostics(
        userId,
        `unorouter-diagnostics-${stamp}.json`,
        { includeContent },
      );
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
          <DropdownMenuItem onClick={() => setDbStudioOpen(true)}>
            <Icon name="database" className="size-4" />
            {t("CHAT.MORE.LOCAL_DB")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => downloadDiagnostics(false)}>
            <Icon name="clipboard-copy" className="size-4" />
            {t("CHAT.MORE.DIAGNOSTICS")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => downloadDiagnostics(true)}>
            <Icon name="file-text" className="size-4" />
            {t("CHAT.MORE.DIAGNOSTICS_FULL")}
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
      {dbStudioOpen && (
        <LocalDbStudio open={dbStudioOpen} onOpenChange={setDbStudioOpen} />
      )}
      {themeOpen && (
        <ThemeCustomizerSheet open={themeOpen} onOpenChange={setThemeOpen} />
      )}
    </>
  );
}
