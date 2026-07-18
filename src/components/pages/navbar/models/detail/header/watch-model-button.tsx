"use client";

import { Icon } from "@/components/ui/icon";
import { useModelWatch } from "@/hooks/models/notify-hook";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export function WatchModelButton(props: {
  modelName: string;
  className?: string;
}) {
  const t = useTranslations();
  const watch = useModelWatch(props.modelName);

  return (
    <button
      type="button"
      onClick={() => watch.toggle()}
      className={cn(
        "border-border inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 font-mono text-[10px] tracking-[0.15em] uppercase transition-colors",
        watch.watched
          ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
          : "bg-muted/40 hover:bg-muted",
        props.className,
      )}
    >
      <Icon name="bell" className="size-3" />
      {watch.watched ? t("NOTIFY.UNWATCH") : t("NOTIFY.WATCH")}
    </button>
  );
}
