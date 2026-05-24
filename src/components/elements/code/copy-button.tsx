"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { analytics } from "@/lib/analytics";
import { copyToClipboard } from "@/lib/utils/base";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

type Props = {
  text: string;
  label?: string;
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
    if (!props.label) {
      toast.success(props.toastMessage ?? t("DASHBOARD.COPIED"));
    }
    setTimeout(() => setCopied(false), 1500);
  }

  if (props.label) {
    return (
      <Button variant="outline" size="sm" onClick={handleCopy}>
        <Icon name={copied ? "check" : "copy"} />
        {copied ? t("CHAT.REQUEST_LOG.COPIED") : props.label}
      </Button>
    );
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
