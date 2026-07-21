"use client";

import { Icon } from "@/components/ui/icon";
import { copyToClipboard } from "@/lib/utils/base";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

export function HeadingAnchor(props: { id: string }) {
  const t = useTranslations();
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    const url = `${window.location.origin}${window.location.pathname}#${props.id}`;
    window.history.replaceState(null, "", `#${props.id}`);
    copyToClipboard(url);
    setCopied(true);
    toast.success(t("DOCS.LINK_COPIED"));
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={t("DOCS.COPY_LINK")}
      className="text-muted-foreground hover:text-foreground ml-2 inline-flex size-6 shrink-0 items-center justify-center align-middle opacity-0 transition-opacity group-hover/heading:opacity-100 focus-visible:opacity-100"
    >
      <Icon name={copied ? "check" : "link"} className="h-4 w-4" />
    </button>
  );
}
