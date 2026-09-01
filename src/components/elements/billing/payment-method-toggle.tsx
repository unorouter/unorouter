"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBillingActions } from "@/hooks/ui/use-billing-actions";
import { useTranslations } from "next-intl";

export function PaymentMethodToggle(props: {
  centered?: boolean;
  compact?: boolean;
}) {
  const t = useTranslations();
  const billing = useBillingActions();

  if (billing.availableMethods.length < 2) return null;

  return (
    <div
      className={
        props.centered
          ? "flex min-w-0 flex-col items-center space-y-2"
          : "min-w-0 space-y-2"
      }
    >
      {!props.compact && (
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {t("BILLING.PAYMENT_METHOD.LABEL")}
        </p>
      )}
      <Tabs
        className="min-w-0"
        value={billing.paymentMethod}
        onValueChange={(value) => {
          const method = billing.availableMethods.find((m) => m === value);
          if (method) billing.setPaymentMethod(method);
        }}
      >
        {/* Long localized labels (vi) overflow a phone; wrap instead of widening. Trigger height is overridden because h-[calc(100%-1px)] resolves against the wrapped list. */}
        <TabsList className="h-auto max-w-full flex-wrap group-data-horizontal/tabs:h-auto [&>button]:h-8 [&>button]:flex-none">
          {billing.availableMethods.includes("card") && (
            <TabsTrigger value="card">
              {t("BILLING.PAYMENT_METHOD.CARD")}
            </TabsTrigger>
          )}
          {billing.availableMethods.includes("paypal") && (
            <TabsTrigger value="paypal">
              {t("BILLING.PAYMENT_METHOD.PAYPAL")}
            </TabsTrigger>
          )}
          {billing.availableMethods.includes("crypto") && (
            <TabsTrigger value="crypto">
              {t("BILLING.PAYMENT_METHOD.CRYPTO")}
            </TabsTrigger>
          )}
        </TabsList>
      </Tabs>
    </div>
  );
}
