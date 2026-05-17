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
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
import { analytics } from "@/lib/analytics";
import { copyToClipboard } from "@/lib/utils/base";
import { chatFontAtom, type ChatFont } from "@/store/chat-store";
import { useAui } from "@assistant-ui/react";
import { useAtom } from "jotai";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { LocalDbStudio } from "@/components/elements/local-db-studio";
import { ConversationOverridesDrawer } from "@/components/pages/sidebar/chat/conversation/conversation-overrides-drawer";
import {
  LuClipboardCopy,
  LuCopy,
  LuDatabase,
  LuDownload,
  LuEllipsisVertical,
  LuSettings2,
  LuType,
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
  const [font, setFont] = useAtom(chatFontAtom);
  const [dbStudioOpen, setDbStudioOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const dbClickRef = useRef<number>(0);

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
        analytics.chat.conversationExportFailed({ format });
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
      analytics.chat.conversationExported({ format });
      return;
    }
    const data = await exportMut.mutateAsync({
      convId: props.convId,
      format,
    });
    const date = new Date().toISOString().slice(0, 10);
    const suffix = format === "orpg" ? "orpg" : "native";
    downloadJson(data, `unorouter-chat-${suffix}-${date}.json`);
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

  const handleMarkdown = async () => {
    if (!props.convId) return;
    const data = await markdownMut.mutateAsync({ id: props.convId });
    await copyToClipboard(data.markdown);
    analytics.chat.markdownCopied({ char_count: data.markdown.length });
    toast.success(t("CHAT.MORE.MARKDOWN_COPIED"));
  };

  const handleDuplicate = async () => {
    if (!props.convId) return;
    const data = await duplicateMut.mutateAsync({ id: props.convId });
    analytics.chat.conversationDuplicated();
    aui.threads().switchToThread(data.id);
    toast.success(t("CHAT.MORE.DUPLICATE_SUCCESS"));
  };

  const handleClear = async () => {
    if (!props.convId) return;
    setConfirmClearOpen(false);
    await clearMut.mutateAsync({ id: props.convId });
    analytics.chat.conversationCleared();
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
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuItem onSelect={() => setSettingsOpen(true)}>
            <LuSettings2 className="size-4" />
            {t("CHAT.OVERRIDES.OPEN")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
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
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <LuType className="size-4" />
              {t("CHAT.MORE.FONT")}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup
                value={font}
                onValueChange={(v) => setFont(v as ChatFont)}
              >
                <DropdownMenuRadioItem value="sans">
                  {t("CHAT.MORE.FONT_SANS")}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="display">
                  {t("CHAT.MORE.FONT_DISPLAY")}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="serif">
                  {t("CHAT.MORE.FONT_SERIF")}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="mono">
                  {t("CHAT.MORE.FONT_MONO")}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="system">
                  {t("CHAT.MORE.FONT_SYSTEM")}
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              const now = Date.now();
              if (now - dbClickRef.current < 400) {
                dbClickRef.current = 0;
                setDbStudioOpen(true);
              } else {
                dbClickRef.current = now;
                toast.message(t("CHAT.MORE.LOCAL_DB_DOUBLE_CLICK"));
              }
            }}
          >
            <LuDatabase className="size-4" />
            {t("CHAT.MORE.LOCAL_DB")}
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            disabled={!hasConv || clearMut.isPending}
            onClick={() => {
              analytics.chat.clearConfirmOpened();
              setConfirmClearOpen(true);
            }}
          >
            <LuTrash2 className="size-4" />
            {t("CHAT.MORE.CLEAR")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConversationOverridesDrawer
        convId={props.convId}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
      <LocalDbStudio open={dbStudioOpen} onOpenChange={setDbStudioOpen} />

      <Dialog open={confirmClearOpen} onOpenChange={setConfirmClearOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("CHAT.MORE.CLEAR_CONFIRM_TITLE")}</DialogTitle>
            <DialogDescription>
              {t("CHAT.MORE.CLEAR_CONFIRM_DESC")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmClearOpen(false)}>
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
