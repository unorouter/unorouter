"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { useRedeemMutation } from "@/hooks/billing/billing-hook";
import { renderQuota } from "@/lib/config/constants";
import { handleError } from "@/lib/utils/client";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

export function RedeemSection() {
  const t = useTranslations();
  const redeemMutation = useRedeemMutation();
  const [key, setKey] = useState("");

  function handleRedeem() {
    const trimmed = key.trim();
    if (!trimmed) return;
    redeemMutation.mutate(
      { body: { key: trimmed } },
      {
        onSuccess: (quota) => {
          setKey("");
          toast.success(
            t("BILLING.REDEEM.SUCCESS", { amount: renderQuota(quota) }),
          );
        },
        onError: (error) => handleError(error, t),
      },
    );
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Input
        value={key}
        onChange={(e) => setKey(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleRedeem();
        }}
        placeholder={t("BILLING.REDEEM.PLACEHOLDER")}
        className="font-mono text-sm"
        autoComplete="off"
        spellCheck={false}
      />
      <Button
        onClick={handleRedeem}
        disabled={!key.trim() || redeemMutation.isPending}
        className="sm:w-auto"
      >
        <Icon name="ticket" className="mr-1 h-4 w-4" />
        {t("BILLING.REDEEM.SUBMIT")}
      </Button>
    </div>
  );
}
