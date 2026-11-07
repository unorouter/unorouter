"use client";

import { countTokens } from "@/lib/ai/chat/tokenizer";
import { useTranslations } from "next-intl";
import {
  useWatch,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";

export function TokenEstimate<T extends FieldValues>(props: {
  control: Control<T>;
  name: Path<T>;
}) {
  const t = useTranslations();
  const value: unknown = useWatch({ control: props.control, name: props.name });
  const text = typeof value === "string" ? value : "";
  const count = countTokens(text);
  if (!text.trim() || count === 0) return null;
  return (
    <p className="text-muted-foreground text-xs">
      {t("RP.TOKEN_ESTIMATE", { count })}
    </p>
  );
}
