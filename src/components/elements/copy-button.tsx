"use client";

import { copyToClipboard } from "@/lib/utils/base";
import { LuCheck, LuCopy } from "react-icons/lu";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

type Props = {
  text: string;
  className?: string;
  iconSize?: string;
  toastMessage?: string;
};

export function CopyButton(props: Props) {
  const t = useTranslations();
  const [copied, setCopied] = useState(false);
  const iconClass = props.iconSize ?? "h-3.5 w-3.5";

  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    copyToClipboard(props.text);
    setCopied(true);
    toast.success(props.toastMessage ?? t("DASHBOARD.COPIED"));
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      onClick={handleCopy}
      className={props.className ?? "text-muted-foreground hover:text-foreground transition-colors"}
      aria-label={t("COMMON.COPY_CODE")}
    >
      {copied ? (
        <LuCheck className={iconClass} />
      ) : (
        <LuCopy className={iconClass} />
      )}
    </button>
  );
}
