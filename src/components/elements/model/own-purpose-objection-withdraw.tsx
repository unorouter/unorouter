"use client";

import { countryName } from "@/components/elements/model/group-data-policy";
import { Button } from "@/components/ui/button";
import { useSetOwnPurposeObjectionMutation } from "@/hooks/auth/own-purpose-objection-hook";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

type ObjectedProvider = { label: string; country: string };

function isObjectedProvider(value: unknown): value is ObjectedProvider {
  return (
    typeof value === "object" &&
    value !== null &&
    "label" in value &&
    typeof value.label === "string" &&
    "country" in value &&
    typeof value.country === "string"
  );
}

// The gateway's `param` for own_purpose_objected: a JSON list of the providers
// that block the model.
export function parseObjectedProviders(
  param: string | null | undefined,
): ObjectedProvider[] {
  if (!param) return [];
  try {
    const parsed: unknown = JSON.parse(param);
    return Array.isArray(parsed) ? parsed.filter(isObjectedProvider) : [];
  } catch {
    return [];
  }
}

export function objectedProvidersText(
  providers: ObjectedProvider[],
  locale: string,
): string {
  return providers
    .map((p) =>
      p.country ? `${p.label} (${countryName(p.country, locale)})` : p.label,
    )
    .join(", ");
}

export function OwnPurposeObjectionWithdrawButton(props: {
  className?: string;
}) {
  const t = useTranslations();
  const setMutation = useSetOwnPurposeObjectionMutation();
  return (
    <Button
      size="sm"
      variant="outline"
      className={props.className}
      disabled={setMutation.isPending}
      onClick={() =>
        setMutation.mutate(
          { body: { objection: false } },
          {
            onSuccess: () => toast.success(t("OWN_PURPOSE.WITHDRAWN")),
            onError: (error) => toast.error(error.message),
          },
        )
      }
    >
      {t("OWN_PURPOSE.WITHDRAW_BUTTON")}
    </Button>
  );
}
