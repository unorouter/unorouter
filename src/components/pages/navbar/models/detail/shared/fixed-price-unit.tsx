"use client";

import { fixedPriceUnitLabel } from "@/lib/api/model-modality";
import type { ProcessedModel } from "@/lib/api/pricing";
import { useTranslations } from "next-intl";

export function FixedPriceUnit(props: { model: ProcessedModel }) {
  const t = useTranslations();
  const unit = fixedPriceUnitLabel(props.model);
  if (unit === "second") return <>{t("MODELS.PRICE.PER_SECOND")}</>;
  if (unit === "image") return <>{t("MODELS.PRICE.PER_IMAGE")}</>;
  return <>{t("MODELS.PRICE.PER_REQUEST")}</>;
}
