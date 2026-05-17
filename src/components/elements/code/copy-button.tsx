"use client";

import { analytics } from "@/lib/analytics";
import { copyToClipboard } from "@/lib/utils/base";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Icon } from "@/components/ui/icon";

type Props = {
  text: string;
  className?: string;
  iconSize?: string;
  toastMessage?: string;
  analyticsLabel?: string;
};

export function CopyButton(props: Props) {
  const t = useTranslations();
  const [copied, setCopied] = useState(false);
  const iconClass = props.iconSize ?? "h-3.5 w-3.5";

  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    copyToClipboard(props.text);
    if (props.analyticsLabel) {
      analytics.content.copied({ label: props.analyticsLabel });
    }
    setCopied(true);
    toast.success(props.toastMessage ?? t("DASHBOARD.COPIED"));
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      onClick={handleCopy}
      className={
        props.className ??
        "text-muted-foreground hover:text-foreground flex size-6 items-center justify-center transition-colors"
      }
      aria-label={t("COMMON.COPY_CODE")}
    >
      {copied ? (
        <Icon name="check" className={iconClass} />
      ) : (
        <Icon name="copy" className={iconClass} />
      )}
    </button>
  );
}
