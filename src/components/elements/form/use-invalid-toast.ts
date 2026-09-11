"use client";

import type { TObject } from "@sinclair/typebox/type";
import type { FieldErrors } from "react-hook-form";
import { formatFieldError } from "./my-form-error";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

type ErrorNode = { message?: unknown } | Record<string, unknown>;

function firstError(
  errors: ErrorNode,
  path: string[] = [],
): { name: string; message: string } | null {
  for (const key of Object.keys(errors)) {
    const node = (errors as Record<string, unknown>)[key];
    if (!node || typeof node !== "object") continue;
    const message = (node as { message?: unknown }).message;
    if (typeof message === "string" && message) {
      return { name: [...path, key].join("."), message };
    }
    const nested = firstError(node as ErrorNode, [...path, key]);
    if (nested) return nested;
  }
  return null;
}

// react-hook-form abandons the submit when validation fails, and a field inside
// an inactive tab is unmounted, so its message renders nowhere and the button
// reads as dead. Name the field instead.
export function useInvalidToast(schema: TObject) {
  const t = useTranslations();
  return (errors: FieldErrors) => {
    const found = firstError(errors);
    if (!found) {
      toast.error(t("FORM.ERROR.INVALID"));
      return;
    }
    const formatted = formatFieldError(t, schema, found.name, found.message);
    toast.error(formatted.label, { description: formatted.message });
  };
}
