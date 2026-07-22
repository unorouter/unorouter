"use client";

import { confirm } from "@/components/ui/confirm";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import {
  useClearConversationMutation,
  useDuplicateConversationMutation,
} from "@/hooks/ai/chat-hook";
import { analytics } from "@/lib/analytics";
import { useAui } from "@assistant-ui/react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ImportExportSubmenu } from "./import-export-submenu";

type Props = {
  convId: string | null;
  onOpenDbStudio: () => void;
};

export function ToolsSubmenu(props: Props) {
  const t = useTranslations();
  const aui = useAui();
  const duplicateMut = useDuplicateConversationMutation();
  const clearMut = useClearConversationMutation();
  const hasConv = !!props.convId;

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
    const ok = await confirm({
      title: t("COMMON.CONFIRM.CLEAR_CHAT_TITLE"),
      description: t("CHAT.MORE.CLEAR_CONFIRM_DESC"),
      confirmLabel: t("CHAT.MORE.CLEAR"),
      cancelLabel: t("COMMON.CANCEL"),
      destructive: true,
    });
    if (!ok) return;
    await clearMut.mutateAsync({ id: props.convId });
    analytics.chat.conversationCleared();
    toast.success(t("CHAT.MORE.CLEAR_SUCCESS"));
  };

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Icon name="wrench" className="size-4" />
        {t("CHAT.MORE.TOOLS")}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuItem
          disabled={!hasConv || duplicateMut.isPending}
          onClick={handleDuplicate}
        >
          <Icon name="copy" className="size-4" />
          {t("CHAT.MORE.DUPLICATE")}
        </DropdownMenuItem>
        <ImportExportSubmenu convId={props.convId} />
        <DropdownMenuItem onClick={props.onOpenDbStudio}>
          <Icon name="database" className="size-4" />
          {t("CHAT.MORE.LOCAL_DB")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={!hasConv || clearMut.isPending}
          onClick={handleClear}
        >
          <Icon name="trash-2" className="size-4" />
          {t("CHAT.MORE.CLEAR")}
        </DropdownMenuItem>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
