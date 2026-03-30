"use client";

import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { LuTrash2 } from "react-icons/lu";

dayjs.extend(relativeTime);

type ConversationItemProps = {
  conversation: {
    id: string;
    title: string | null;
    model: string;
    updatedAt: Date;
  };
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
};

export function ConversationItem(props: ConversationItemProps) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={props.isSelected}
        onClick={props.onSelect}
        className={cn(
          "group h-auto py-2",
          props.isSelected && "bg-primary/10 text-primary font-medium",
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm">
            {props.conversation.title || "New conversation"}
          </div>
          <div className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-[10px]">
            <span className="font-mono">{props.conversation.model}</span>
            <span>&middot;</span>
            <span>{dayjs(props.conversation.updatedAt).fromNow()}</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-destructive h-6 w-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            props.onDelete();
          }}
        >
          <LuTrash2 className="h-3.5 w-3.5" />
        </Button>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
