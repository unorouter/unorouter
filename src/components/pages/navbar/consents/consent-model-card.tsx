"use client";

import { CountryFlags } from "@/components/elements/model/group-data-policy";
import { ModelCardTitle } from "@/components/pages/navbar/models/browse/model-list-card";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import {
  ConsentActionButton,
  ConsentStatusText,
  KIND_LABEL,
} from "./consent-action";
import type { ConsentRow } from "./consent-rows";

export function ConsentModelCard(props: {
  row: ConsentRow;
  onOpen: (model: string) => void;
}) {
  const t = useTranslations();
  const row = props.row;
  return (
    <div className="border-border/60 flex items-start justify-between gap-4 border-b px-2 py-5">
      <div className="min-w-0 space-y-2">
        <ModelCardTitle model={row.model} />
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs">
          <span>
            {t("MODELS.LIST.BY")} {row.model.vendor}
          </span>
          <span>{t(KIND_LABEL[row.kind])}</span>
          <CountryFlags codes={row.countries} />
          {!row.model.online && (
            <Badge variant="outline">{t("FREE_CONSENT.OFFLINE")}</Badge>
          )}
        </div>
        <ConsentStatusText row={row} />
      </div>
      <div className="shrink-0">
        <ConsentActionButton row={row} onOpen={props.onOpen} />
      </div>
    </div>
  );
}
