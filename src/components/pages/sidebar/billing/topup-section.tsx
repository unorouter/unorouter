"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBillingActions } from "@/hooks/ui/use-billing-actions";
import { useTranslations } from "next-intl";
import { useState } from "react";

// Mirrors Creem's custom_price bounds in the upstream handler; NowPayments shares them.
const CUSTOM_MIN = 1;
const CUSTOM_MAX = 100000;
// DeloPay takes whole dollars only (int64 upstream).
const DELOPAY_MAX = 100000;

function CustomAmountField(props: {
  disabled: boolean;
  min?: number;
  max?: number;
  integer?: boolean;
  chargedAmount?: (amount: number) => number;
  onPay: (amount: number) => void;
}) {
  const t = useTranslations();
  const [value, setValue] = useState("");

  const min = props.min ?? CUSTOM_MIN;
  const max = props.max ?? CUSTOM_MAX;
  const parsed = Number(value);
  const valid =
    value.trim() !== "" &&
    Number.isFinite(parsed) &&
    (!props.integer || Number.isInteger(parsed)) &&
    parsed >= min &&
    parsed <= max;

  return (
    <div className="border-border space-y-3 border p-4">
      <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
        {t("BILLING.TOPUP.CUSTOM_AMOUNT")}
      </span>
      <div className="flex items-center gap-3">
        <Input
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={props.integer ? "1" : "0.01"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={Number.isInteger(min) ? String(min) : min.toFixed(2)}
          className="max-w-40"
        />
        <span className="text-muted-foreground shrink-0 font-mono text-[10px]">
          {t("BILLING.TOPUP.ACTUAL_PAYMENT")}{" "}
          <span className="text-foreground tabular-nums">
            $
            {valid
              ? (props.chargedAmount?.(parsed) ?? parsed).toFixed(2)
              : "0.00"}
          </span>
        </span>
        <Button
          size="sm"
          className="ml-auto"
          disabled={!valid || props.disabled}
          onClick={() => props.onPay(parsed)}
        >
          {t("BILLING.TOPUP.PAY")}
        </Button>
      </div>
    </div>
  );
}

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
      className="border-border hover:border-primary/50 focus-visible:border-primary focus-visible:ring-ring/50 flex flex-col items-center gap-1 border p-4 transition-colors focus-visible:ring-[3px] focus-visible:outline-none disabled:opacity-50"
    >
      <span className="text-foreground text-2xl font-bold tracking-tight tabular-nums">
        ${props.price}
      </span>
      <span className="text-muted-foreground font-mono text-[10px]">
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
  const billing = useBillingActions();
  const topUpInfo = billing.topUpInfo;

  const amountOptions = topUpInfo?.amount_options ?? [];
  const creemProducts = topUpInfo?.creemProducts ?? [];
  const cheapestCreemProductId =
    creemProducts
      .filter((p) => p.price > 0)
      .sort((a, b) => a.price - b.price)[0]?.productId ?? "";

  if (
    !billing.enableStripe &&
    !billing.enableCreem &&
    !billing.enableNowPayments &&
    !billing.enableDeloPay
  )
    return null;

  const showCrypto =
    billing.paymentMethod === "crypto" && billing.enableNowPayments;
  const showPayPal =
    billing.paymentMethod === "paypal" && billing.enableDeloPay;
  const showCard = billing.paymentMethod === "card" && billing.enableCard;
  const grid = "grid grid-cols-2 gap-3 md:grid-cols-4";

  return (
    <div className="space-y-6">
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
        <div className="space-y-3">
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
          <CustomAmountField
            chargedAmount={billing.creemChargedAmount}
            disabled={billing.isTopUpMutating}
            onPay={(amount) =>
              billing.payCreem(cheapestCreemProductId, amount, true)
            }
          />
        </div>
      )}

      {showCrypto && (
        <div className="space-y-3">
          <div className={grid}>
            {amountOptions.map((amount) => (
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
          <CustomAmountField
            integer
            disabled={billing.isTopUpMutating}
            onPay={(amount) => billing.payNowPayments(amount)}
          />
        </div>
      )}

      {showPayPal && (
        <div className="space-y-3">
          <div className={grid}>
            {amountOptions
              .filter(
                (amount) =>
                  amount >= billing.deloPayMinTopUp && amount <= DELOPAY_MAX,
              )
              .map((amount) => (
                <TopUpTile
                  key={amount}
                  price={amount}
                  actual={billing.deloPayChargedAmount(amount)}
                  save={billing.discountSavings(amount)}
                  disabled={billing.isTopUpMutating}
                  onPay={() => billing.payDeloPay(amount)}
                />
              ))}
          </div>
          <CustomAmountField
            integer
            min={billing.deloPayMinTopUp}
            max={DELOPAY_MAX}
            chargedAmount={billing.deloPayChargedAmount}
            disabled={billing.isTopUpMutating}
            onPay={(amount) => billing.payDeloPay(amount)}
          />
        </div>
      )}
    </div>
  );
}
