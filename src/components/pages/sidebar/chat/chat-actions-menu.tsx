"use client";

import { LocalDbStudio } from "@/components/elements/db/local-db-studio";
import { ConversationOverridesDrawer } from "@/components/pages/sidebar/chat/conversation/conversation-overrides-drawer";
import { openRpTabAtom } from "@/components/pages/sidebar/chat/sidebar/rp-dialogs";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import { useAuthQuery } from "@/hooks/auth/auth-hook";
import {
  useClearConversationMutation,
  useConversationMarkdown,
  useDuplicateConversationMutation,
} from "@/hooks/ai/chat-hook";
import {
  useExportConversation,
  useImportConversationMutation,
} from "@/hooks/ai/rp/conversations";
import {
  useRemoveSyncMutation,
  useSyncMutation,
  useSyncStateForRow,
} from "@/hooks/ai/sync-hook";
import { Link } from "@/i18n/navigation";
import { analytics } from "@/lib/analytics";
import { copyToClipboard } from "@/lib/utils/base";
import { rpc } from "@/lib/rpc";
import { downloadBlob, downloadJson } from "@/lib/utils/client";
import type { ExportFormat } from "@/lib/validation/rp";
import { useAui } from "@assistant-ui/react";
import { useSetAtom } from "jotai";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";

type Props = {
  convId: string | null;
};

export function ChatActionsMenu(props: Props) {
  const t = useTranslations();
  const locale = useLocale();
  const aui = useAui();
  const auth = useAuthQuery();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const setOpenRpTab = useSetAtom(openRpTabAtom);
  const clearMut = useClearConversationMutation();
  const duplicateMut = useDuplicateConversationMutation();
  const markdownMut = useConversationMarkdown();
  const exportMut = useExportConversation();
  const importMut = useImportConversationMutation();
  const syncMut = useSyncMutation();
  const removeSyncMut = useRemoveSyncMutation();
  const syncState = useSyncStateForRow("conversations", props.convId ?? "");
  const [dbStudioOpen, setDbStudioOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const isLoggedIn = !!auth.data;
  const hasConv = !!props.convId;
  const isSynced = syncState.syncExpiresAt != null;
  const syncExpiresLabel = syncState.syncExpiresAt
    ? new Date(syncState.syncExpiresAt).toLocaleDateString(locale, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;

  const handleAddSync = () => {
    if (!props.convId) return;
    syncMut.mutate({ kind: "conversations", id: props.convId });
  };
  const handleRemoveSync = () => {
    if (!props.convId) return;
    if (!window.confirm(t("SYNC.CONFIRM_REMOVE"))) return;
    removeSyncMut.mutate({ kind: "conversations", id: props.convId });
  };

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
          ?.match(/filename="([^"]+)"/)?.[1] ?? `chat-${props.convId}.jsonl`;
      downloadBlob(blob, fname);
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
    analytics.chat.clearConfirmOpened();
    if (!window.confirm(t("CHAT.MORE.CLEAR_CONFIRM_DESC"))) return;
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
          <Icon name="ellipsis-vertical" className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
            <Icon name="settings-2" className="size-4" />
            {t("CHAT.OVERRIDES.OPEN")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setOpenRpTab("characters")}>
            <Icon name="users" className="size-4" />
            {t("RP.SIDEBAR_TAB_CHARACTERS")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOpenRpTab("personas")}>
            <Icon name="user" className="size-4" />
            {t("RP.SIDEBAR_TAB_PERSONAS")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOpenRpTab("lorebooks")}>
            <Icon name="book-text" className="size-4" />
            {t("RP.SIDEBAR_TAB_LOREBOOKS")}
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/chat/presets" />}>
            <Icon name="sliders-horizontal" className="size-4" />
            {t("RP.SIDEBAR_TAB_PRESETS")}
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/chat/cards" />}>
            <Icon name="layers" className="size-4" />
            {t("RP.SIDEBAR_TAB_CARDS")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {isLoggedIn && hasConv && !isSynced && (
            <>
              <DropdownMenuItem
                onClick={handleAddSync}
                disabled={syncMut.isPending}
              >
                <Icon name="cloud-upload" className="size-4" />
                {t("SYNC.ADD_SYNC")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          {isLoggedIn && hasConv && isSynced && (
            <>
              <DropdownMenuItem
                onClick={handleAddSync}
                disabled={syncMut.isPending}
              >
                <Icon name="refresh-ccw" className="size-4" />
                {syncExpiresLabel
                  ? t("SYNC.RESYNC_EXPIRES", { date: syncExpiresLabel })
                  : t("SYNC.RESYNC")}
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={handleRemoveSync}
                disabled={removeSyncMut.isPending}
              >
                <Icon name="cloud-off" className="size-4" />
                {t("SYNC.REMOVE_SYNC")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
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
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={!hasConv || markdownMut.isPending}
            onClick={handleMarkdown}
          >
            <Icon name="clipboard-copy" className="size-4" />
            {t("CHAT.MORE.GET_MARKDOWN")}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!hasConv || duplicateMut.isPending}
            onClick={handleDuplicate}
          >
            <Icon name="copy" className="size-4" />
            {t("CHAT.MORE.DUPLICATE")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setDbStudioOpen(true)}>
            <Icon name="database" className="size-4" />
            {t("CHAT.MORE.LOCAL_DB")}
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            disabled={!hasConv || clearMut.isPending}
            onClick={handleClear}
          >
            <Icon name="trash-2" className="size-4" />
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
    </>
  );
}
