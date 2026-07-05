"use client";

import { confirm } from "@/components/ui/confirm";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import {
  useDeleteChatGroupMutation,
  useRenameChatGroupMutation,
} from "@/hooks/ai/chat-hook";
import type { ChatGroupRow } from "@/lib/db/schema/rows";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { ReactNode } from "react";

type Props = {
  group: ChatGroupRow;
  count: number;
  onToggle: () => void;
  children: ReactNode;
};

export function ChatGroupSection(props: Props) {
  const t = useTranslations();
  const renameGroup = useRenameChatGroupMutation();
  const deleteGroup = useDeleteChatGroupMutation();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(props.group.name);

  const commitRename = () => {
    setRenaming(false);
    const next = name.trim();
    if (next && next !== props.group.name) {
      renameGroup.mutate({ id: props.group.id, name: next });
    } else {
      setName(props.group.name);
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: t("CHAT.GROUPS.DELETE_CONFIRM_TITLE"),
      description: t("CHAT.GROUPS.DELETE_CONFIRM_DESC"),
      confirmLabel: t("COMMON.DELETE"),
      cancelLabel: t("COMMON.CANCEL"),
      destructive: true,
    });
    if (ok) deleteGroup.mutate({ id: props.group.id });
  };

  return (
    <div className="flex flex-col gap-0.5">
      <div className="text-muted-foreground hover:bg-accent/50 group flex h-7 items-center gap-1 rounded-md px-1 text-xs font-medium">
        <button
          type="button"
          onClick={props.onToggle}
          className="flex min-w-0 flex-1 items-center gap-1"
        >
          <Icon
            name={props.group.folded ? "chevron-right" : "chevron-down"}
            className="size-3.5 shrink-0"
          />
          {renaming ? (
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") {
                  setName(props.group.name);
                  setRenaming(false);
                }
              }}
              onClick={(e) => e.stopPropagation()}
              className="bg-background min-w-0 flex-1 rounded px-1 text-xs outline-none"
            />
          ) : (
            <span className="truncate">{props.group.name}</span>
          )}
          <span className="text-muted-foreground/60 shrink-0">
            {props.count}
          </span>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger
            className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
            aria-label={t("COMMON.OPEN_MENU")}
          >
            <Icon name="ellipsis" className="size-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                setName(props.group.name);
                setRenaming(true);
              }}
            >
              <Icon name="pencil" className="size-4" />
              {t("CHAT.GROUPS.RENAME")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-destructive"
            >
              <Icon name="trash-2" className="size-4" />
              {t("CHAT.GROUPS.DELETE")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {!props.group.folded && (
        <div className="flex flex-col gap-1 pl-3">{props.children}</div>
      )}
    </div>
  );
}
