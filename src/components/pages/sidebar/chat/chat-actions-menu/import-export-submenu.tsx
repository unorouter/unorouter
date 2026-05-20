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
import { analytics } from "@/lib/analytics";
import { env } from "@/lib/config/env";
import { rpc } from "@/lib/rpc";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportMut = useExportConversation();
  const importMut = useImportConversationMutation();

  const hasConv = !!props.convId;

  const handleExport = async (format: ExportFormat) => {
    if (!props.convId) return;

    if (format === "sillytavern") {
      // SillyTavern returns a JSONL download (not a JSON envelope), so we
      // pull the raw Response from Eden Treaty and trigger a save.
      const { response, error } = await rpc.api.ai.rp
        .conversations({ id: props.convId })
        .export.get({ query: { format: "sillytavern" } });
      if (error || !response.ok) {
        analytics.chat.conversationExportFailed({ format });
        toast.error(t("CHAT.MORE.EXPORT_FAILED"));
        return;
      }
      const blob = await response.blob();
      const fname =
        response.headers
          .get("content-disposition")
          ?.match(/filename="([^"]+)"/)?.[1] ?? `${env.appName.toLowerCase()}-chat-${props.convId}.jsonl`;
      downloadBlob(blob, fname);
      analytics.chat.conversationExported({ format });
      return;
    }
    const data = await exportMut.mutateAsync({ convId: props.convId, format });
    const date = new Date().toISOString().slice(0, 10);
    const suffix = format === "orpg" ? "orpg" : "native";

    downloadJson(data, `${env.appName.toLowerCase()}-chat-${suffix}-${date}.json`);
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
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    </>
  );
}
