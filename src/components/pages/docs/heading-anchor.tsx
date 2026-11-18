"use client";

import { Icon } from "@/components/ui/icon";
import { copyText } from "@/lib/utils/client";
import { useTranslations } from "next-intl";
import { useState } from "react";

export function HeadingAnchor(props: { id: string; title: string }) {
  const t = useTranslations();
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    const url = `${window.location.origin}${window.location.pathname}#${props.id}`;
    window.history.replaceState(null, "", `#${props.id}`);
    void copyText(t, url, t("DOCS.LINK_COPIED")).then((ok) => {
      if (!ok) return;
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={t("DOCS.COPY_LINK")}
      className="group/heading inline-flex items-center gap-2 text-left"
    >
      {props.title}
      <Icon
        name={copied ? "check" : "link"}
        className="text-muted-foreground h-4 w-4 shrink-0 opacity-0 transition-opacity group-hover/heading:opacity-100"
      />
    </button>
  );
}
