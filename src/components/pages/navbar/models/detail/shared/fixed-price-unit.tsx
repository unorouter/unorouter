"use client";

import { fixedPriceUnitLabel } from "@/lib/api/model-modality";
import type { ModelMetadata } from "@/lib/api/pricing";
import { useTranslations } from "next-intl";

export function FixedPriceUnit(props: {
  model: { type: string; metadata: ModelMetadata };
}) {
  const t = useTranslations();
  const unit = fixedPriceUnitLabel(props.model);
  if (unit === "second") return <>{t("MODELS.PRICE.PER_SECOND")}</>;
  if (unit === "image") return <>{t("MODELS.PRICE.PER_IMAGE")}</>;
  return <>{t("MODELS.PRICE.PER_REQUEST")}</>;
}
