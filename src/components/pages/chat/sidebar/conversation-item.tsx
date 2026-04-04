"use client";

import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUpdateConversationMutation } from "@/hooks/chat-hook";
import { usePricingQuery } from "@/hooks/pricing-hook";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { LuCheck, LuEllipsis, LuPencil, LuTrash2, LuX } from "react-icons/lu";

type ConversationItemProps = {
  conversation: {
    id: string;
    title: string | null;
    model: string;
    totalCost?: number;
    updatedAt: Date;
  };
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
};

export function ConversationItem(props: ConversationItemProps) {
  const t = useTranslations();
  const pricingQuery = usePricingQuery();
  const updateMutation = useUpdateConversationMutation();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const modelData = pricingQuery.data?.models?.find(
    (m) => m.name === props.conversation.model,
  );
  const vendorName =
    typeof modelData?.vendor === "string"
      ? modelData.vendor
      : (modelData?.vendor?.name ?? "");

  function startEditing() {
    setEditValue(props.conversation.title || "");
    setIsEditing(true);
    setMenuOpen(false);
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

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={props.onSelect}
      onKeyDown={(e) => e.key === "Enter" && props.onSelect()}
      data-active={props.isSelected || undefined}
      className={cn(
        "group/conv flex h-9 cursor-pointer items-center gap-2 rounded-lg transition-colors",
        "hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
        props.isSelected && "bg-muted",
      )}
    >
      {isEditing ? (
        <div
          className="flex h-full min-w-0 flex-1 items-center gap-1 px-3"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") saveEdit();
              if (e.key === "Escape") setIsEditing(false);
            }}
            className="bg-background border-border ring-ring min-w-0 flex-1 rounded border px-1.5 py-0.5 text-sm outline-none focus:ring-1"
          />
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground flex size-6 items-center justify-center rounded-md"
            onClick={saveEdit}
          >
            <LuCheck className="size-3.5" />
          </button>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground flex size-6 items-center justify-center rounded-md"
            onClick={() => setIsEditing(false)}
          >
            <LuX className="size-3.5" />
          </button>
        </div>
      ) : (
        <>
          <div className="flex h-full min-w-0 flex-1 items-center gap-2 px-3 text-start text-sm">
            <VendorIcon vendor={vendorName} size={14} className="shrink-0" />
            <span className="min-w-0 flex-1 truncate">
              {props.conversation.title || t("CHAT.NEW_CONVERSATION")}
            </span>
          </div>
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "mr-2 flex size-7 items-center justify-center rounded-md p-0 transition-opacity",
                "opacity-0 group-hover/conv:opacity-100",
                "data-[state=open]:bg-accent data-[state=open]:opacity-100",
                props.isSelected && "opacity-100",
              )}
            >
              <LuEllipsis className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="bottom"
              align="start"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenuItem onClick={startEditing} className="gap-2">
                <LuPencil className="size-4" />
                {t("CHAT.RENAME")}
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  props.onDelete();
                  setMenuOpen(false);
                }}
                className="gap-2"
              >
                <LuTrash2 className="size-4" />
                {t("CHAT.DELETE")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
    </div>
  );
}
