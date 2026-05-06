"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useClearConversationMutation,
  useConversationMarkdown,
  useDuplicateConversationMutation,
} from "@/hooks/chat-hook";
import {
  useExportConversation,
  useImportConversationMutation,
} from "@/hooks/rp-hook";
import { copyToClipboard } from "@/lib/utils/base";
import { useAui } from "@assistant-ui/react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import {
  LuClipboardCopy,
  LuCopy,
  LuDownload,
  LuEllipsisVertical,
  LuTrash2,
  LuUpload,
} from "react-icons/lu";
import { toast } from "sonner";

type Props = {
  /** null when no conversation is selected (fresh thread). Buttons that need
   * a conv id are hidden in that case. */
  convId: string | null;
};

function downloadJson(obj: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function ChatActionsMenu(props: Props) {
  const t = useTranslations();
  const aui = useAui();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const clearMut = useClearConversationMutation();
  const duplicateMut = useDuplicateConversationMutation();
  const markdownMut = useConversationMarkdown();
  const exportMut = useExportConversation();
  const importMut = useImportConversationMutation();

  const hasConv = !!props.convId;

  const handleExport = async (format: "native" | "orpg" | "sillytavern") => {
    if (!props.convId) return;
    if (format === "sillytavern") {
      // SillyTavern returns a JSONL download (not a JSON envelope), so we
      // fetch the URL directly and trigger a save without going through the
      // Eden Treaty client.
      const res = await fetch(
        `/api/rp/conversations/${props.convId}/export?format=sillytavern`,
        { credentials: "include" },
      );
      if (!res.ok) {
        toast.error(t("CHAT.MORE.EXPORT_FAILED"));
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const fname =
        res.headers
          .get("content-disposition")
          ?.match(/filename="([^"]+)"/)?.[1] ?? `chat-${props.convId}.jsonl`;
      link.href = url;
      link.download = fname;
      link.click();
      URL.revokeObjectURL(url);
      return;
    }
    const data = await exportMut.mutateAsync({
      convId: props.convId,
      format,
    });
    const date = new Date().toISOString().slice(0, 10);
    const suffix = format === "orpg" ? "orpg" : "native";
    downloadJson(data, `unorouter-chat-${suffix}-${date}.json`);
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const result = await importMut.mutateAsync(file);
    if (result?.id) {
      aui.threads().switchToThread(result.id);
      toast.success(t("CHAT.MORE.IMPORT_SUCCESS"));
    }
  };

  const handleMarkdown = async () => {
    if (!props.convId) return;
    const data = await markdownMut.mutateAsync({ id: props.convId });
    await copyToClipboard(data.markdown);
    toast.success(t("CHAT.MORE.MARKDOWN_COPIED"));
  };

  const handleDuplicate = async () => {
    if (!props.convId) return;
    const data = await duplicateMut.mutateAsync({ id: props.convId });
    aui.threads().switchToThread(data.id);
    toast.success(t("CHAT.MORE.DUPLICATE_SUCCESS"));
  };

  const handleClear = async () => {
    if (!props.convId) return;
    setConfirmClearOpen(false);
    await clearMut.mutateAsync({ id: props.convId });
    toast.success(t("CHAT.MORE.CLEAR_SUCCESS"));
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
          <LuEllipsisVertical className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem
            disabled={!hasConv || exportMut.isPending}
            onClick={() => handleExport("native")}
          >
            <LuDownload className="size-4" />
            {t("CHAT.MORE.EXPORT_NATIVE")}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!hasConv || exportMut.isPending}
            onClick={() => handleExport("orpg")}
          >
            <LuDownload className="size-4" />
            {t("CHAT.MORE.EXPORT_ORPG")}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!hasConv}
            onClick={() => handleExport("sillytavern")}
          >
            <LuDownload className="size-4" />
            {t("CHAT.MORE.EXPORT_SILLYTAVERN")}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={importMut.isPending}
            onClick={handleImportClick}
          >
            <LuUpload className="size-4" />
            {t("CHAT.MORE.IMPORT")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={!hasConv || markdownMut.isPending}
            onClick={handleMarkdown}
          >
            <LuClipboardCopy className="size-4" />
            {t("CHAT.MORE.GET_MARKDOWN")}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!hasConv || duplicateMut.isPending}
            onClick={handleDuplicate}
          >
            <LuCopy className="size-4" />
            {t("CHAT.MORE.DUPLICATE")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={!hasConv || clearMut.isPending}
            onClick={() => setConfirmClearOpen(true)}
          >
            <LuTrash2 className="size-4" />
            {t("CHAT.MORE.CLEAR")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmClearOpen} onOpenChange={setConfirmClearOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("CHAT.MORE.CLEAR_CONFIRM_TITLE")}</DialogTitle>
            <DialogDescription>
              {t("CHAT.MORE.CLEAR_CONFIRM_DESC")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setConfirmClearOpen(false)}
            >
              {t("COMMON.CANCEL")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleClear}
              disabled={clearMut.isPending}
            >
              {t("CHAT.MORE.CLEAR")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
