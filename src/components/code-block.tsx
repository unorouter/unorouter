"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  code: string;
  language?: string;
  className?: string;
};

export function CodeBlock(props: Props) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(props.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={cn("group relative", props.className)}>
      {props.language && (
        <div className="border-border bg-muted/50 flex items-center justify-between border-x border-t px-4 py-2">
          <span className="text-muted-foreground font-mono text-xs uppercase">
            {props.language}
          </span>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={handleCopy}
            aria-label="Copy code"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      )}
      <div
        className={cn(
          "border-border bg-muted/30 overflow-x-auto border p-4",
          !props.language && "rounded-md"
        )}
      >
        {!props.language && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={handleCopy}
            className="absolute top-3 right-3 opacity-0 transition-opacity group-hover:opacity-100"
            aria-label="Copy code"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
        )}
        <pre className="text-sm leading-relaxed">
          <code className="font-mono">{props.code}</code>
        </pre>
      </div>
    </div>
  );
}
