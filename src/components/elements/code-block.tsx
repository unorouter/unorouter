"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
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
    <div className={cn("w-full bg-[#0A0A0A] border border-white/10 font-mono text-sm relative group rounded-sm overflow-hidden hover:border-white/20 transition-colors duration-500", props.className)}>
      {props.language && (
        <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/5">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">
            {props.language}
          </span>
          <div className="flex gap-1.5 opacity-50">
            <div className="w-2 h-2 rounded-full bg-white/20" />
            <div className="w-2 h-2 rounded-full bg-white/20" />
          </div>
        </div>
      )}
      <div className="p-8 text-gray-400 space-y-6">
        <pre className="font-mono text-xs md:text-sm leading-relaxed whitespace-pre-wrap break-all">
          <code>{props.code}</code>
        </pre>
      </div>
      <button
        onClick={handleCopy}
        className="absolute top-16 right-6 text-gray-500 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-sm"
        aria-label="Copy code"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}
