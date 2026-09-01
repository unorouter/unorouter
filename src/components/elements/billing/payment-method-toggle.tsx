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
        {/* Long localized labels (vi: "The / Google & Apple Pay / Alipay")
            outgrow a phone, and TabsList is inline-flex w-fit so it cannot
            shrink: scroll the strip instead of pushing the page wider. */}
        <TabsList className="max-w-full overflow-x-auto">
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
