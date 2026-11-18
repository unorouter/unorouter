"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { copyText } from "@/lib/utils/client";
import { useTranslations } from "next-intl";
import { useState } from "react";

type Props = {
  text: string;
  label?: string;
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
    const success = props.label
      ? undefined
      : (props.toastMessage ?? t("DASHBOARD.COPIED"));
    void copyText(t, props.text, success).then((ok) => {
      if (!ok) return;
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
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
