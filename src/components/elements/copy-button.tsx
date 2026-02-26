"use client";

import { LuCheck, LuCopy } from "react-icons/lu";
import { useTranslations } from "next-intl";
import { useState } from "react";

type Props = {
  text: string;
  className?: string;
};

export function CopyButton(props: Props) {
  const t = useTranslations();
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
      aria-label={t("COMMON.COPY_CODE")}
    >
      {copied ? (
        <LuCheck className="h-3.5 w-3.5" />
      ) : (
        <LuCopy className="h-3.5 w-3.5" />
      )}
    </button>
  );
}
