"use client";

import { SidebarMenuItem } from "@/components/ui/sidebar";
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
      <div
        role="button"
        tabIndex={0}
        onClick={props.onSelect}
        onKeyDown={(e) => e.key === "Enter" && props.onSelect()}
        className={cn(
          "group flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-left transition-colors",
          props.isSelected
            ? "bg-primary/10 text-primary font-medium"
            : "hover:bg-sidebar-accent",
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
        <span
          role="button"
          tabIndex={0}
          className="text-muted-foreground hover:text-destructive flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md opacity-0 transition-opacity group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            props.onDelete();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.stopPropagation();
              props.onDelete();
            }
          }}
        >
          <LuTrash2 className="h-3.5 w-3.5" />
        </span>
      </div>
    </SidebarMenuItem>
  );
}
