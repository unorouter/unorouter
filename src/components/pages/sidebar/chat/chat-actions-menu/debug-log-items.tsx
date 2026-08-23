"use client";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import {
  clearChatDebugLog,
  clearFailedRequestCaptures,
} from "@/lib/utils/chat-debug-log";
import { dayjs } from "@/lib/utils/format/date";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

export function DebugLogItems() {
  const t = useTranslations();

  const download = async () => {
    try {
      const stamp = dayjs().format("YYYYMMDD-HHmmss");
      const { downloadDiagnostics } =
        await import("@/lib/db/client/data/diagnostics/db-export");
      await downloadDiagnostics(`unorouter-diagnostics-${stamp}.json`);
    } catch (e) {
      toast.error(String(e).slice(0, 120));
    }
  };

  return (
    <>
      <DropdownMenuItem onClick={download}>
        <Icon name="clipboard-copy" className="size-4" />
        {t("CHAT.MORE.DIAGNOSTICS")}
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={() => {
          clearChatDebugLog();
          clearFailedRequestCaptures();
          toast.success(t("CHAT.MORE.DEBUG_CLEARED"));
        }}
      >
        <Icon name="trash-2" className="size-4" />
        {t("CHAT.MORE.DEBUG_CLEAR")}
      </DropdownMenuItem>
    </>
  );
}
