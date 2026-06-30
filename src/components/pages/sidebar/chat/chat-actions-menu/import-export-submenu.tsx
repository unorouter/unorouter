import {
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import {
  useExportConversation,
  useImportConversationMutation,
} from "@/hooks/ai/rp/conversations";
import { useLocalUserId } from "@/hooks/auth/use-local-user-id";
import { analytics } from "@/lib/analytics";
import { env } from "@/lib/config/env";
import { clearChatDebugLog } from "@/lib/utils/chat-debug-log";
import { exportLocalConversationSillyTavern } from "@/lib/db/client/data/transfer/sillytavern";
import { dayjs } from "@/lib/utils/format/date";
import { downloadBlob, downloadJson } from "@/lib/utils/client";
import type { ExportFormat } from "@/lib/validation/rp";
import { useAui } from "@assistant-ui/react";
import { useTranslations } from "next-intl";
import { useRef } from "react";
import { toast } from "sonner";

type Props = {
  convId: string | null;
};

export function ImportExportSubmenu(props: Props) {
  const t = useTranslations();
  const aui = useAui();
  const userId = useLocalUserId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportMut = useExportConversation();
  const importMut = useImportConversationMutation();
  const hasConv = !!props.convId;

  const downloadDiagnostics = async (includeContent: boolean) => {
    try {
      const stamp = dayjs().format("YYYYMMDD-HHmmss");
      const { downloadDiagnosticsStreaming } =
        await import("@/lib/db/client/data/stream-download");
      await downloadDiagnosticsStreaming(
        userId,
        `unorouter-diagnostics-${stamp}.json`,
        { includeContent },
      );
    } catch (e) {
      toast.error(String(e).slice(0, 120));
    }
  };

  const handleExport = async (format: ExportFormat) => {
    if (!props.convId) return;

    if (format === "sillytavern") {
      // SillyTavern is a JSONL download (not a JSON envelope) built from the local DB; download the raw string as a blob.
      try {
        const result = await exportLocalConversationSillyTavern(
          userId,
          props.convId,
        );
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

  const handleImportClick = () => {
    analytics.chat.importPickerOpened();
    fileInputRef.current?.click();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const result = await importMut.mutateAsync(file);
    if (result?.id) {
      analytics.chat.conversationImported();
      aui.threads().switchToThread(result.id);
      toast.success(t("CHAT.MORE.IMPORT_SUCCESS"));
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,application/jsonl,.json,.jsonl"
        onChange={handleFile}
        className="hidden"
      />
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
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    </>
  );
}
