"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

// Row actions dropdown: rename, delete.
export function ConversationItemMenu(props: {
  conversationId: string;
  isSelected: boolean;
  isLoggedIn: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations();

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
