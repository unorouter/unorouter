"use client";

import { LuCheck, LuCopy } from "react-icons/lu";
import { useState } from "react";

type Props = {
  text: string;
  className?: string;
};

export function CopyButton(props: Props) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(props.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className={props.className}
      aria-label="Copy code"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
}
