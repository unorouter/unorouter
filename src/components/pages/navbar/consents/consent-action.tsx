"use client";

import { Button } from "@/components/ui/button";
import { msg } from "@/lib/config/constants";
import { useTranslations } from "next-intl";
import type { ConsentKind, ConsentRow } from "./consent-rows";

export const KIND_LABEL = {
  consent: msg("CONSENT.KIND_CONSENT"),
  none: msg("CONSENT.NOT_NEEDED"),
} satisfies Record<ConsentKind, ReturnType<typeof msg>>;

const STATUS_TEXT = {
  given: msg("CONSENT.COVERED_BY_PROVIDERS"),
  missing: msg("CONSENT.FILTER.MISSING"),
  not_needed: msg("CONSENT.NOT_NEEDED"),
} satisfies Record<ConsentRow["status"], ReturnType<typeof msg>>;

export function ConsentStatusText(props: { row: ConsentRow }) {
  const t = useTranslations();
  return (
    <span className="text-muted-foreground text-xs">
      {t(STATUS_TEXT[props.row.status])}
    </span>
  );
}

// Withdrawal happens per provider on the providers tab.
export function ConsentActionButton(props: {
  row: ConsentRow;
  onOpen: (model: string) => void;
}) {
  const t = useTranslations();
  if (props.row.status !== "missing") return null;
  return (
    <Button size="sm" onClick={() => props.onOpen(props.row.model.model_name)}>
      {t("CONSENT.GIVE")}
    </Button>
  );
}
