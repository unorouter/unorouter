"use client";

import { Icon } from "@/components/ui/icon";
import { useState } from "react";

export function ConversationItemEditor(props: {
  initialTitle: string;
  onSave: (title: string) => void;
  onCancel: () => void;
}) {
  const [editValue, setEditValue] = useState(props.initialTitle);

  return (
    <div
      className="flex h-full min-w-0 flex-1 items-center gap-1 px-3 py-2"
      onClick={(e) => e.stopPropagation()}
    >
      <input
        autoFocus
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") props.onSave(editValue.trim());
          if (e.key === "Escape") props.onCancel();
        }}
        className="bg-background border-border ring-ring min-w-0 flex-1 rounded border px-1.5 py-0.5 text-sm outline-none focus:ring-1"
      />
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground flex size-6 items-center justify-center rounded-md"
        onClick={() => props.onSave(editValue.trim())}
      >
        <Icon name="check" className="size-3.5" />
      </button>
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground flex size-6 items-center justify-center rounded-md"
        onClick={props.onCancel}
      >
        <Icon name="x" className="size-3.5" />
      </button>
    </div>
  );
}
