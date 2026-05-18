"use client";

import { useBillingActions } from "@/hooks/ui/use-billing-actions";
import { DEFAULT_TOPUP_AMOUNTS } from "@/lib/api/subscription";
import { useTranslations } from "next-intl";

export function TopUpSection() {
  const t = useTranslations();
  const billing = useBillingActions();
  const topUpInfo = billing.topUpInfo;

  const amountOptions = topUpInfo?.amount_options ?? [];
  const creemProducts = topUpInfo?.creemProducts ?? [];

  if (!billing.enableStripe && !billing.enableCreem) return null;

  return (
    <div className="space-y-6">
      <h2 className="text-foreground text-lg font-bold tracking-tight">
        {t("BILLING.TOPUP.TITLE")}
      </h2>

      {billing.enableStripe && amountOptions.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {amountOptions.map((amount) => {
            const actual = billing.discountedAmount(amount);
            const save = billing.discountSavings(amount);
            return (
              <button
                key={amount}
                onClick={() => billing.payStripe(amount)}
                disabled={billing.isTopUpMutating}
                className="border-border hover:border-primary/50 flex flex-col items-center gap-2 border p-4 transition-colors disabled:opacity-50"
              >
                <span className="text-foreground text-2xl font-bold tabular-nums">
                  {amount} $
                </span>
                <span className="text-muted-foreground font-mono text-[11px]">
                  {t("BILLING.TOPUP.ACTUAL_PAYMENT")} ${actual.toFixed(2)}
                  {save > 0 && (
                    <>
                      , {t("BILLING.TOPUP.SAVE")} ${save.toFixed(2)}
                    </>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {billing.enableCreem && creemProducts.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {creemProducts.map((product, index) => (
            <button
              key={product.productId ?? index}
              onClick={() => billing.payCreem(product.productId, product.price)}
              disabled={billing.isTopUpMutating}
              className="border-border hover:border-primary/50 flex flex-col items-center gap-2 border p-4 transition-colors disabled:opacity-50"
            >
              <span className="text-foreground text-2xl font-bold tabular-nums">
                {product.price} $
              </span>
              <span className="text-muted-foreground font-mono text-[11px]">
                {t("BILLING.TOPUP.ACTUAL_PAYMENT")} ${product.price.toFixed(2)}
              </span>
            </button>
          ))}
        </div>
      )}

      {billing.enableStripe &&
        amountOptions.length === 0 &&
        creemProducts.length === 0 && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {DEFAULT_TOPUP_AMOUNTS.map((amount) => (
              <button
                key={amount}
                onClick={() => billing.payStripe(amount)}
                disabled={billing.isTopUpMutating}
                className="border-border hover:border-primary/50 flex flex-col items-center gap-2 border p-4 transition-colors disabled:opacity-50"
              >
                <span className="text-foreground text-2xl font-bold tabular-nums">
                  {amount} $
                </span>
                <span className="text-muted-foreground font-mono text-[11px]">
                  {t("BILLING.TOPUP.ACTUAL_PAYMENT")} ${amount.toFixed(2)}
                </span>
              </button>
            ))}
          </div>
        )}
    </div>
  );
}
