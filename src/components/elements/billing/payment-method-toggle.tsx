"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBillingActions } from "@/hooks/ui/use-billing-actions";
import type { PaymentMethod } from "@/store/client-store";
import { useTranslations } from "next-intl";

export function PaymentMethodToggle(props: { centered?: boolean }) {
  const t = useTranslations();
  const billing = useBillingActions();

  if (billing.availableMethods.length < 2) return null;

  return (
    <div
      className={
        props.centered ? "flex flex-col items-center space-y-2" : "space-y-2"
      }
    >
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {t("BILLING.PAYMENT_METHOD.LABEL")}
      </p>
      <Tabs
        value={billing.paymentMethod}
        onValueChange={(value) =>
          billing.setPaymentMethod(value as PaymentMethod)
        }
      >
        <TabsList>
          <TabsTrigger value="card">
            {t("BILLING.PAYMENT_METHOD.CARD")}
          </TabsTrigger>
          <TabsTrigger value="crypto">
            {t("BILLING.PAYMENT_METHOD.CRYPTO")}
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
