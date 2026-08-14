"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { env } from "@/lib/config/env";
import { useTranslations } from "next-intl";

export function ModelsEmpty(props: {
  filtered: boolean;
  count: number;
  onReset: () => void;
}) {
  const t = useTranslations();
  return (
    <div className="text-muted-foreground flex flex-col items-center gap-3 py-24 text-center">
      {props.filtered ? (
        <>
          <span>{t("MODELS.EMPTY_FILTERED", { count: props.count })}</span>
          <Button size="sm" onClick={props.onReset}>
            <Icon name="filter-x" className="mr-1.5 h-4 w-4" />
            {t("MODELS.FILTER.RESET")}
          </Button>
        </>
      ) : (
        <>
          {t("MODELS.EMPTY")}
          {env.discordUrl && (
            <a
              href={env.discordUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground inline-flex items-center gap-1.5 text-xs transition-colors"
            >
              <Icon name="brand-discord" className="h-3.5 w-3.5" />
              {t("MODELS.DISCORD")}
            </a>
          )}
        </>
      )}
    </div>
  );
}
