"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useState } from "react";

export function ModelDescription(props: { text: string }) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  return (
    <div>
      <p
        className={cn(
          "text-muted-foreground max-w-3xl text-sm leading-relaxed",
          open ? "" : "line-clamp-2",
        )}
      >
        {props.text}
      </p>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-muted-foreground hover:text-foreground mt-1 text-xs transition-colors"
      >
        {open ? t("MODEL_PAGE.SHOW_LESS") : t("MODEL_PAGE.SHOW_MORE")}
      </button>
    </div>
  );
}
