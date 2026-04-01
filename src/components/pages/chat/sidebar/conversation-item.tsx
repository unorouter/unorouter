"use client";

import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import { SidebarMenuItem } from "@/components/ui/sidebar";
import { usePricingQuery } from "@/hooks/pricing-hook";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useUpdateConversationMutation } from "@/hooks/chat-hook";
import { useRef, useState } from "react";
import { LuCheck, LuPencil, LuTrash2, LuX } from "react-icons/lu";

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
  const pricingQuery = usePricingQuery();
  const updateMutation = useUpdateConversationMutation();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const modelData = pricingQuery.data?.models?.find(
    (m) => m.name === props.conversation.model,
  );
  const vendorName =
    typeof modelData?.vendor === "string"
      ? modelData.vendor
      : (modelData?.vendor?.name ?? "");

  function startEditing(e: React.MouseEvent) {
    e.stopPropagation();
    setEditValue(props.conversation.title || "");
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function saveEdit() {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== props.conversation.title) {
      updateMutation.mutate({
        id: props.conversation.id,
        body: { title: trimmed },
      });
    }
    setIsEditing(false);
  }

  function cancelEdit() {
    setIsEditing(false);
  }

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
          {isEditing ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") saveEdit();
                if (e.key === "Escape") cancelEdit();
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-full rounded border border-border bg-background px-1 py-0.5 text-sm outline-none focus:ring-1 focus:ring-ring"
            />
          ) : (
            <div className="truncate text-sm">
              {props.conversation.title || "New conversation"}
            </div>
          )}
          <div className="text-muted-foreground mt-0.5 flex items-center gap-1 overflow-hidden text-[10px] leading-none">
            <VendorIcon vendor={vendorName} size={10} className="shrink-0" />
            <span className="truncate font-mono" title={props.conversation.model}>
              {props.conversation.model}
            </span>
            <span className="shrink-0">&middot;</span>
            <span className="shrink-0 whitespace-nowrap">
              {dayjs(props.conversation.updatedAt).fromNow()}
            </span>
          </div>
        </div>
        <div className="-mr-1 flex shrink-0 flex-col items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          {isEditing ? (
            <>
              <span
                role="button"
                tabIndex={0}
                className="text-muted-foreground hover:text-foreground flex h-6 w-6 cursor-pointer items-center justify-center rounded-md"
                onClick={(e) => {
                  e.stopPropagation();
                  saveEdit();
                }}
              >
                <LuCheck className="h-3.5 w-3.5" />
              </span>
              <span
                role="button"
                tabIndex={0}
                className="text-muted-foreground hover:text-foreground flex h-6 w-6 cursor-pointer items-center justify-center rounded-md"
                onClick={(e) => {
                  e.stopPropagation();
                  cancelEdit();
                }}
              >
                <LuX className="h-3.5 w-3.5" />
              </span>
            </>
          ) : (
            <>
              <span
                role="button"
                tabIndex={0}
                className="text-muted-foreground hover:text-foreground flex h-6 w-6 cursor-pointer items-center justify-center rounded-md"
                onClick={startEditing}
              >
                <LuPencil className="h-3 w-3" />
              </span>
              <span
                role="button"
                tabIndex={0}
                className="text-muted-foreground hover:text-destructive flex h-6 w-6 cursor-pointer items-center justify-center rounded-md"
                onClick={(e) => {
                  e.stopPropagation();
                  props.onDelete();
                }}
              >
                <LuTrash2 className="h-3.5 w-3.5" />
              </span>
            </>
          )}
        </div>
      </div>
    </SidebarMenuItem>
  );
}
