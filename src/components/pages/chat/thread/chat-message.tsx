"use client";

import type { UIMessage } from "ai";
import { LuCopy, LuCheck, LuUser, LuBot } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";

type ChatMessageProps = {
  message: UIMessage;
};

function getTextContent(message: UIMessage): string {
  if (!message.parts) return "";
  return message.parts
    .filter((p) => p.type === "text")
    .map((p) => ("text" in p ? p.text : ""))
    .join("");
}

export function ChatMessage(props: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const isUser = props.message.role === "user";
  const text = getTextContent(props.message);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("group flex gap-3", isUser && "flex-row-reverse")}>
      {/* Avatar */}
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted",
        )}
      >
        {isUser ? (
          <LuUser className="h-3.5 w-3.5" />
        ) : (
          <LuBot className="h-3.5 w-3.5" />
        )}
      </div>

      {/* Content */}
      <div
        className={cn(
          "relative max-w-[80%] rounded-lg px-4 py-3",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground",
        )}
      >
        <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed wrap-break-word whitespace-pre-wrap">
          {text}
        </div>

        {/* Copy button */}
        {!isUser && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-1 -right-10 h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={handleCopy}
          >
            {copied ? (
              <LuCheck className="h-3.5 w-3.5" />
            ) : (
              <LuCopy className="h-3.5 w-3.5" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
