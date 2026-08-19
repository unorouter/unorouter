"use client";

import { fixedPriceUnitLabel } from "@/lib/api/model-modality";
import { useTranslations } from "next-intl";

export function FixedPriceUnit(props: {
  // Only the modality and price columns are read; metadata never is.
  model: { type: string };
}) {
  const t = useTranslations();
  const unit = fixedPriceUnitLabel(props.model);
  if (unit === "second") return <>{t("MODELS.PRICE.PER_SECOND")}</>;
  if (unit === "image") return <>{t("MODELS.PRICE.PER_IMAGE")}</>;
  return <>{t("MODELS.PRICE.PER_REQUEST")}</>;
}
