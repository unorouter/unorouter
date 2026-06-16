"use client";

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
import {
  useChatGroupsQuery,
  useCreateChatGroupMutation,
  useMoveConversationToGroupMutation,
} from "@/hooks/ai/chat-hook";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export function ConversationItemMenu(props: {
  conversationId: string;
  isSelected: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations();
  const groupsQuery = useChatGroupsQuery();
  const moveToGroup = useMoveConversationToGroupMutation();
  const createGroup = useCreateChatGroupMutation();
  const groups = groupsQuery.data ?? [];

  const move = (groupId: string | null) => {
    moveToGroup.mutate({ convId: props.conversationId, groupId });
    props.onOpenChange(false);
  };

  return (
    <DropdownMenu open={props.open} onOpenChange={props.onOpenChange}>
      <DropdownMenuTrigger
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "absolute right-1 flex size-7 shrink-0 items-center justify-center rounded-md p-0 transition-opacity",
          "opacity-0 group-hover/conv:opacity-100",
          "data-[state=open]:bg-accent data-[state=open]:opacity-100",
          props.isSelected && "opacity-100",
        )}
      >
        <Icon name="ellipsis" className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="bottom"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenuItem onClick={props.onRename} className="gap-2">
          <Icon name="pencil" className="size-4" />
          {t("CHAT.ACTION.RENAME")}
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="gap-2">
            <Icon name="layers" className="size-4" />
            {t("CHAT.GROUPS.MOVE_TO")}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => move(null)} className="gap-2">
              <Icon name="x" className="size-4" />
              {t("CHAT.GROUPS.UNGROUPED")}
            </DropdownMenuItem>
            {groups.length > 0 && <DropdownMenuSeparator />}
            {groups.map((g) => (
              <DropdownMenuItem
                key={g.id}
                onClick={() => move(g.id)}
                className="gap-2"
              >
                <Icon name="layers" className="size-4" />
                <span className="truncate">{g.name}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() =>
                createGroup.mutate(
                  { name: t("CHAT.GROUPS.GROUP_UNTITLED") },
                  {
                    onSuccess: (data) => move(data.id),
                  },
                )
              }
              className="gap-2"
            >
              <Icon name="plus-circle" className="size-4" />
              {t("CHAT.GROUPS.NEW_GROUP")}
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={(e) => {
            e.stopPropagation();
            props.onDelete();
            props.onOpenChange(false);
          }}
          className="gap-2"
        >
          <Icon name="trash-2" className="size-4" />
          {t("CHAT.ACTION.DELETE")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
