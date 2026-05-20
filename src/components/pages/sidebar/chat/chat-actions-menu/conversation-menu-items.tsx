import { confirm } from "@/components/ui/confirm";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import {
  useClearConversationMutation,
  useConversationMarkdown,
  useDuplicateConversationMutation,
} from "@/hooks/ai/chat-hook";
import { analytics } from "@/lib/analytics";
import { copyToClipboard } from "@/lib/utils/base";
import { useAui } from "@assistant-ui/react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

type Props = {
  convId: string | null;
  onOpenDbStudio: () => void;
};

export function ConversationMenuItems(props: Props) {
  const t = useTranslations();
  const aui = useAui();
  const markdownMut = useConversationMarkdown();
  const duplicateMut = useDuplicateConversationMutation();
  const clearMut = useClearConversationMutation();

  const hasConv = !!props.convId;

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
    <>
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
      <DropdownMenuItem onClick={props.onOpenDbStudio}>
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
    </>
  );
}
