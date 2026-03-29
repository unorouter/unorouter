"use client";

import { Skeleton } from "@/components/ui/skeleton";
import {
  useCreemTopUpMutation,
  useStripeTopUpMutation,
  useTopUpInfoQuery,
} from "@/hooks/billing-hook";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

type CreemProduct = {
  productId: string;
  name: string;
  price: number;
  currency: string;
};

export function TopUpSection() {
  const t = useTranslations();
  const topUpInfoQuery = useTopUpInfoQuery();
  const stripeTopUpMutation = useStripeTopUpMutation();
  const creemTopUpMutation = useCreemTopUpMutation();

  const topUpInfo = topUpInfoQuery.data;

  const enableStripe = topUpInfo?.enable_stripe_topup ?? false;
  const enableCreem = topUpInfo?.enable_creem_topup ?? false;
  const amountOptions = topUpInfo?.amount_options ?? [];
  const discount = topUpInfo?.discount ?? {};

  let creemProducts: CreemProduct[] = [];
  if (enableCreem && topUpInfo?.creem_products) {
    try {
      creemProducts = JSON.parse(topUpInfo.creem_products);
    } catch {}
  }

  const isLoading = topUpInfoQuery.isLoading;
  const isMutating =
    stripeTopUpMutation.isPending || creemTopUpMutation.isPending;

  function getDiscountedAmount(amount: number): number {
    const key = String(amount);
    if (discount[key]) {
      return Math.round(amount * discount[key] * 100) / 100;
    }
    return amount;
  }

  function getSaveAmount(amount: number): number {
    const discounted = getDiscountedAmount(amount);
    return Math.round((amount - discounted) * 100) / 100;
  }

  function handleStripeTopUp(amount: number) {
    stripeTopUpMutation.mutate({ body: { amount, payment_method: "stripe" } }, {
      onSuccess: (data) => {
        if (data.pay_link) window.open(data.pay_link, "_blank");
      },
      onError: () => {
        toast.error(t("BILLING.PAYMENT_FAILED"));
      },
    });
  }

  function handleCreemTopUp(productId: string) {
    creemTopUpMutation.mutate({ body: { product_id: productId, payment_method: "creem" } }, {
      onSuccess: (data) => {
        if (data.checkout_url) window.open(data.checkout_url, "_blank");
      },
      onError: () => {
        toast.error(t("BILLING.PAYMENT_FAILED"));
      },
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      </div>
    );
  }

  if (!enableStripe && !enableCreem) return null;

  return (
    <div className="space-y-6">
      <h2 className="text-foreground text-lg font-bold tracking-tight">
        {t("BILLING.QUOTA_TOP_UP")}
      </h2>

      {/* Stripe top-up amounts */}
      {enableStripe && amountOptions.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {amountOptions.map((amount) => {
            const actual = getDiscountedAmount(amount);
            const save = getSaveAmount(amount);
            return (
              <button
                key={amount}
                onClick={() => handleStripeTopUp(amount)}
                disabled={isMutating}
                className="border-border hover:border-primary/50 flex flex-col items-center gap-2 border p-4 transition-colors disabled:opacity-50"
              >
                <span className="text-foreground text-2xl font-bold tabular-nums">
                  {amount} $
                </span>
                <span className="text-muted-foreground font-mono text-[11px]">
                  {t("BILLING.ACTUAL_PAYMENT")} ${actual.toFixed(2)}
                  {save > 0 && (
                    <>
                      , {t("BILLING.SAVE")} ${save.toFixed(2)}
                    </>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Creem products */}
      {enableCreem && creemProducts.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {creemProducts.map((product, index) => (
            <button
              key={product.productId ?? index}
              onClick={() => handleCreemTopUp(product.productId)}
              disabled={isMutating}
              className="border-border hover:border-primary/50 flex flex-col items-center gap-2 border p-4 transition-colors disabled:opacity-50"
            >
              <span className="text-foreground text-2xl font-bold tabular-nums">
                {product.price} $
              </span>
              <span className="text-muted-foreground font-mono text-[11px]">
                {t("BILLING.ACTUAL_PAYMENT")} ${product.price.toFixed(2)}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Fallback: Stripe amount buttons when no preset amounts but stripe is enabled */}
      {enableStripe &&
        amountOptions.length === 0 &&
        creemProducts.length === 0 && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[1, 5, 10, 20, 50, 100, 200, 500].map((amount) => (
              <button
                key={amount}
                onClick={() => handleStripeTopUp(amount)}
                disabled={isMutating}
                className="border-border hover:border-primary/50 flex flex-col items-center gap-2 border p-4 transition-colors disabled:opacity-50"
              >
                <span className="text-foreground text-2xl font-bold tabular-nums">
                  {amount} $
                </span>
                <span className="text-muted-foreground font-mono text-[11px]">
                  {t("BILLING.ACTUAL_PAYMENT")} ${amount.toFixed(2)}
                </span>
              </button>
            ))}
          </div>
        )}
    </div>
  );
}
