"use client";

import { PaymentMethodToggle } from "@/components/elements/billing/payment-method-toggle";
import { useBillingActions } from "@/hooks/ui/use-billing-actions";
import { DEFAULT_TOPUP_AMOUNTS } from "@/lib/api/subscription";
import { useTranslations } from "next-intl";

function TopUpTile(props: {
  price: number;
  actual: number;
  save?: number;
  disabled: boolean;
  onPay: () => void;
}) {
  const t = useTranslations();
  return (
    <button
      onClick={props.onPay}
      disabled={props.disabled}
      className="border-border hover:border-primary/50 flex flex-col items-center gap-2 border p-4 transition-colors disabled:opacity-50"
    >
      <span className="text-foreground text-2xl font-bold tabular-nums">
        {props.price} $
      </span>
      <span className="text-muted-foreground font-mono text-[11px]">
        {t("BILLING.TOPUP.ACTUAL_PAYMENT")} ${props.actual.toFixed(2)}
        {(props.save ?? 0) > 0 && (
          <>
            , {t("BILLING.TOPUP.SAVE")} ${props.save!.toFixed(2)}
          </>
        )}
      </span>
    </button>
  );
}

export function TopUpSection() {
  const t = useTranslations();
  const billing = useBillingActions();
  const topUpInfo = billing.topUpInfo;

  const amountOptions = topUpInfo?.amount_options ?? [];
  const creemProducts = topUpInfo?.creemProducts ?? [];

  if (
    !billing.enableStripe &&
    !billing.enableCreem &&
    !billing.enableNowPayments
  )
    return null;

  const showCrypto =
    billing.paymentMethod === "crypto" && billing.enableNowPayments;
  const showCard = billing.paymentMethod === "card" && billing.enableCard;
  const grid = "grid grid-cols-2 gap-3 md:grid-cols-4";

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-foreground text-lg font-bold tracking-tight">
          {t("BILLING.TOPUP.TITLE")}
        </h2>
        <PaymentMethodToggle />
      </div>

      {showCard && billing.enableStripe && amountOptions.length > 0 && (
        <div className={grid}>
          {amountOptions.map((amount) => (
            <TopUpTile
              key={amount}
              price={amount}
              actual={billing.discountedAmount(amount)}
              save={billing.discountSavings(amount)}
              disabled={billing.isTopUpMutating}
              onPay={() => billing.payStripe(amount)}
            />
          ))}
        </div>
      )}

      {showCard && billing.enableCreem && creemProducts.length > 0 && (
        <div className={grid}>
          {creemProducts.map((product, index) => (
            <TopUpTile
              key={product.productId ?? index}
              price={product.price}
              actual={product.price}
              disabled={billing.isTopUpMutating}
              onPay={() => billing.payCreem(product.productId, product.price)}
            />
          ))}
        </div>
      )}

      {showCard &&
        billing.enableStripe &&
        amountOptions.length === 0 &&
        creemProducts.length === 0 && (
          <div className={grid}>
            {DEFAULT_TOPUP_AMOUNTS.map((amount) => (
              <TopUpTile
                key={amount}
                price={amount}
                actual={amount}
                disabled={billing.isTopUpMutating}
                onPay={() => billing.payStripe(amount)}
              />
            ))}
          </div>
        )}

      {showCrypto && (
        <div className={grid}>
          {(amountOptions.length > 0
            ? amountOptions
            : DEFAULT_TOPUP_AMOUNTS
          ).map((amount) => (
            <TopUpTile
              key={amount}
              price={amount}
              actual={billing.discountedAmount(amount)}
              save={billing.discountSavings(amount)}
              disabled={billing.isTopUpMutating}
              onPay={() => billing.payNowPayments(amount)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
