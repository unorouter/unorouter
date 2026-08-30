import {
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import { DebugLogItems } from "./debug-log-items";
import {
  useExportConversation,
  useImportConversationMutation,
} from "@/hooks/ai/rp/conversations";
import { analytics } from "@/lib/analytics";
import { env } from "@/lib/config/env";
import { exportLocalConversationSillyTavern } from "@/lib/db/client/data/transfer/sillytavern";
import { downloadBlob, downloadJson } from "@/lib/utils/client";
import type { ExportFormat } from "@/lib/validation/rp";
import { useAui } from "@assistant-ui/react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

type Props = {
  convId: string | null;
};

export function ImportExportSubmenu(props: Props) {
  const t = useTranslations();
  const aui = useAui();
  const exportMut = useExportConversation();
  const importMut = useImportConversationMutation();
  const hasConv = !!props.convId;

  const handleExport = async (format: ExportFormat) => {
    if (!props.convId) return;

    if (format === "sillytavern") {
      try {
        const result = await exportLocalConversationSillyTavern(props.convId);
        const blob = new Blob([result.data], { type: "application/jsonl" });
        downloadBlob(blob, result.filename);
        analytics.chat.conversationExported({ format });
      } catch {
        analytics.chat.conversationExportFailed({ format });
        toast.error(t("CHAT.MORE.EXPORT_FAILED"));
      }
      return;
    }
    const data = await exportMut.mutateAsync({ convId: props.convId, format });
    downloadJson(data, `${env.appName.toLowerCase()}-chat-${format}.json`);
    analytics.chat.conversationExported({ format });
  };

  const handleFile = async (file: File) => {
    const result = await importMut.mutateAsync(file);
    if (result?.id) {
      analytics.chat.conversationImported();
      aui.threads().switchToThread(result.id);
      toast.success(t("CHAT.MORE.IMPORT_SUCCESS"));
    }
  };

  // Not rendered: clicking the menu item CLOSES the menu, which unmounts
  // anything rendered alongside it, so a ref to a JSX input is already null by
  // the time the handler runs and .click() silently no-ops. The picker has to
  // outlive the menu, so it lives on document.body.
  const handleImportClick = () => {
    analytics.chat.importPickerOpened();
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,application/jsonl,.json,.jsonl";
    input.style.display = "none";
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      input.remove();
      if (file) void handleFile(file);
    });
    // Cancelling the dialog fires no change event, so the node would leak.
    input.addEventListener("cancel", () => input.remove());
    document.body.appendChild(input);
    input.click();
  };

  return (
    <>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <Icon name="arrow-down-up" className="size-4" />
          {t("CHAT.MORE.IMPORT_EXPORT")}
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          <DropdownMenuItem
            disabled={!hasConv || exportMut.isPending}
            onClick={() => handleExport("native")}
          >
            <Icon name="download" className="size-4" />
            {t("CHAT.MORE.EXPORT_NATIVE")}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!hasConv || exportMut.isPending}
            onClick={() => handleExport("orpg")}
          >
            <Icon name="download" className="size-4" />
            {t("CHAT.MORE.EXPORT_ORPG")}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!hasConv}
            onClick={() => handleExport("sillytavern")}
          >
            <Icon name="download" className="size-4" />
            {t("CHAT.MORE.EXPORT_SILLYTAVERN")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={importMut.isPending}
            onClick={handleImportClick}
          >
            <Icon name="upload" className="size-4" />
            {t("CHAT.MORE.IMPORT")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DebugLogItems />
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    </>
  );
}
