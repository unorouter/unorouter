"use client";

import { PaymentMethodToggle } from "@/components/elements/billing/payment-method-toggle";
import { PageHeader } from "@/components/elements/content/page-header";
import { Icon } from "@/components/ui/icon";
import { useAuthQuery } from "@/hooks/auth/auth-hook";
import { useSubscriptionPlansQuery } from "@/hooks/billing/subscription-hook";
import { useBillingActions } from "@/hooks/ui/use-billing-actions";
import { useRouter } from "@/i18n/navigation";
import {
  DEFAULT_TOPUP_AMOUNTS,
  periodWordKey,
  type SubscriptionPlan,
} from "@/lib/api/subscription";
import {
  AUTH_REDIRECT_COOKIE,
  type TranslationKey,
} from "@/lib/config/constants";
import { cn } from "@/lib/utils";
import { setCookie } from "cookies-next/client";
import { useTranslations } from "next-intl";

type TopUpOption = {
  key: string;
  amount: number;
  handler: () => void;
};

// One row in the comparison: a label plus how each column renders its cell.
type RowKey =
  | "upfront"
  | "credit"
  | "delivery"
  | "expiry"
  | "models"
  | "failover"
  | "openai"
  | "priority"
  | "dedicated"
  | "uptime";

// A column = a path the user can take (pay-as-you-go or a plan tier).
type Path = {
  key: string;
  name: string;
  tagline: string;
  popular: boolean;
  cell: (row: RowKey) => React.ReactNode;
  action: React.ReactNode;
};

function Bool(props: { on: boolean }) {
  return props.on ? (
    <Icon name="check" className="h-4 w-4 text-emerald-500" />
  ) : (
    <span className="text-muted-foreground/40">-</span>
  );
}

export function Pricing() {
  const t = useTranslations();
  const router = useRouter();
  const authQuery = useAuthQuery();
  const plansQuery = useSubscriptionPlansQuery();
  const billing = useBillingActions();
  const plans = plansQuery.data ?? [];
  const isLoggedIn = !!authQuery.data;
  const topUpInfo = billing.topUpInfo;

  function redirectToLogin() {
    setCookie(AUTH_REDIRECT_COOKIE, "/pricing", { maxAge: 300 });
    router.push("/login");
  }

  function handleSubscribe(plan: SubscriptionPlan) {
    if (!isLoggedIn) {
      redirectToLogin();
      return;
    }
    billing.subscribe(plan, {
      isLoggedIn,
      onUnauthorized: () => router.push("/billing"),
    });
  }

  function buildTopUpOptions(): TopUpOption[] {
    if (!topUpInfo) return [];

    if (billing.paymentMethod === "crypto" && billing.enableNowPayments) {
      const amounts =
        (topUpInfo.amount_options ?? []).length > 0
          ? (topUpInfo.amount_options ?? [])
          : DEFAULT_TOPUP_AMOUNTS;
      return amounts.map((amount) => ({
        key: `nowpayments-${amount}`,
        amount,
        handler: isLoggedIn
          ? () => billing.payNowPayments(amount)
          : redirectToLogin,
      }));
    }

    if (billing.enableCreem && topUpInfo.creemProducts.length > 0) {
      return topUpInfo.creemProducts.map((product) => ({
        key: product.productId,
        amount: product.price,
        handler: isLoggedIn
          ? () => billing.payCreem(product.productId, product.price)
          : redirectToLogin,
      }));
    }

    if (billing.enableStripe && (topUpInfo.amount_options ?? []).length > 0) {
      return (topUpInfo.amount_options ?? []).map((amount) => ({
        key: `stripe-${amount}`,
        amount,
        handler: isLoggedIn ? () => billing.payStripe(amount) : redirectToLogin,
      }));
    }

    if (billing.enableStripe) {
      return DEFAULT_TOPUP_AMOUNTS.map((amount) => ({
        key: `stripe-${amount}`,
        amount,
        handler: isLoggedIn ? () => billing.payStripe(amount) : redirectToLogin,
      }));
    }

    return [];
  }

  const topUpOptions = buildTopUpOptions();
  const hasTopUp = topUpOptions.length > 0;

  function tierName(index: number): string {
    const k = `PRICING.TIER.${index + 1}` as TranslationKey;
    return t.has(k) ? t(k) : plans[index].title;
  }

  function moneyMo(amount: number, accent?: boolean): React.ReactNode {
    return (
      <span
        className={cn(
          "font-bold tabular-nums",
          accent && "text-emerald-600 dark:text-emerald-400",
        )}
      >
        ${amount}
        <span className="text-muted-foreground font-mono text-[10px]">
          {t("PRICING.CARD.PER_MONTH")}
        </span>
      </span>
    );
  }

  function planDelivery(plan: SubscriptionPlan): React.ReactNode {
    const periodKey = periodWordKey(plan.quotaResetPeriod);
    if (plan.quotaPerResetUsd <= 0 || !periodKey)
      return <span className="text-muted-foreground/40">-</span>;
    return (
      <span className="font-mono text-xs">
        {t("PRICING.MATRIX.WEEKLY_VALUE", {
          amount: `$${plan.quotaPerResetUsd}`,
          period: t(periodKey),
        })}
      </span>
    );
  }

  const subscribeButton = (plan: SubscriptionPlan, popular: boolean) => (
    <button
      type="button"
      onClick={() => handleSubscribe(plan)}
      disabled={billing.isSubMutating}
      className={cn(
        "flex h-10 w-full cursor-pointer items-center justify-center gap-1.5 font-mono text-xs font-bold tracking-widest uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        popular
          ? "bg-primary text-primary-foreground hover:bg-primary/80"
          : "border-border text-foreground hover:border-foreground border bg-transparent",
      )}
    >
      {popular && <Icon name="zap" className="h-3.5 w-3.5" />}
      {t("PRICING.CTA")}
    </button>
  );

  const topUpButtons = (
    <div className="flex flex-wrap justify-center gap-1.5">
      {topUpOptions.map((option) => (
        <button
          key={option.key}
          type="button"
          onClick={option.handler}
          disabled={billing.isTopUpMutating}
          className="border-border hover:border-foreground/50 text-foreground flex min-w-12 cursor-pointer items-center justify-center border px-2 py-1.5 font-mono text-xs font-bold tabular-nums transition-colors disabled:opacity-50"
        >
          ${option.amount}
        </button>
      ))}
    </div>
  );

  // Build the column model: pay-as-you-go first, then each plan tier.
  const paths: Path[] = [];
  if (hasTopUp) {
    paths.push({
      key: "topup",
      name: t("PRICING.MATRIX.TOPUP_NAME"),
      tagline: t("PRICING.MATRIX.TOPUP_TAGLINE"),
      popular: false,
      cell: (row) => {
        switch (row) {
          case "upfront":
            return (
              <span className="font-bold">
                {t("PRICING.MATRIX.ANY_AMOUNT")}
              </span>
            );
          case "credit":
            return (
              <span className="font-mono text-xs">
                {t("PRICING.MATRIX.ONE_TO_ONE")}
              </span>
            );
          case "delivery":
            return (
              <span className="font-mono text-xs">
                {t("PRICING.MATRIX.INSTANT")}
              </span>
            );
          case "expiry":
            return (
              <span className="font-mono text-xs">
                {t("PRICING.MATRIX.NEVER")}
              </span>
            );
          case "priority":
          case "dedicated":
            return <Bool on={false} />;
          default:
            return <Bool on />;
        }
      },
      action: topUpButtons,
    });
  }
  plans.forEach((plan, i) => {
    paths.push({
      key: String(plan.id),
      name: tierName(i),
      tagline: t("PRICING.MATRIX.SUB_TAGLINE"),
      popular: i === 1,
      cell: (row) => {
        switch (row) {
          case "upfront":
            return moneyMo(plan.priceAmount);
          case "credit":
            return moneyMo(plan.estimatedTotalUsd, true);
          case "delivery":
            return planDelivery(plan);
          case "expiry":
            return (
              <span className="font-mono text-xs">
                {t("PRICING.MATRIX.CYCLE")}
              </span>
            );
          case "models":
          case "failover":
          case "openai":
          case "uptime":
            return <Bool on />;
          case "priority":
            return <Bool on={i >= 1} />;
          case "dedicated":
            return <Bool on={i >= 2} />;
        }
      },
      action: subscribeButton(plan, i === 1),
    });
  });

  const rows: { key: RowKey; label: string }[] = [
    { key: "upfront", label: t("PRICING.MATRIX.UPFRONT") },
    { key: "credit", label: t("PRICING.MATRIX.CREDIT") },
    { key: "delivery", label: t("PRICING.MATRIX.DELIVERY") },
    { key: "expiry", label: t("PRICING.MATRIX.EXPIRES") },
    { key: "models", label: t("PRICING.FEATURE.MODELS") },
    { key: "failover", label: t("PRICING.FEATURE.FAILOVER") },
    { key: "openai", label: t("PRICING.FEATURE.OPENAI_COMPAT") },
    { key: "priority", label: t("PRICING.FEATURE.PRIORITY") },
    { key: "dedicated", label: t("PRICING.FEATURE.DEDICATED") },
    { key: "uptime", label: t("PRICING.FEATURE.UPTIME") },
  ];

  const gridCols = {
    gridTemplateColumns: `minmax(8rem,1.1fr) repeat(${paths.length}, minmax(8rem,1fr))`,
  };

  return (
    <section className="border-border/50 relative z-10 border-t pt-24 pb-16">
      <div className="mx-auto max-w-360 px-6">
        <PageHeader
          badge={t("HOME.PRICING.LABEL")}
          badgeIcon="zap"
          title={t("PRICING.TITLE")}
          subtitle={t("PRICING.SUBTITLE")}
          centered
          className="mb-12"
        />

        {hasTopUp && (
          <div className="mb-10 flex justify-center">
            <PaymentMethodToggle centered />
          </div>
        )}

        {/* Desktop: one unified matrix (pay-as-you-go + every tier). */}
        <div className="hidden md:block">
          <div className="min-w-fit">
            <div
              className="border-border grid items-stretch gap-3 border-b pb-4"
              style={gridCols}
            >
              <span />
              {paths.map((path) => (
                <div key={path.key} className="flex flex-col gap-1 px-2">
                  <span
                    className={cn(
                      "font-mono text-xs font-bold tracking-widest uppercase",
                      path.popular
                        ? "text-emerald-600 dark:text-emerald-400"
                        : path.key === "topup"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-foreground",
                    )}
                  >
                    {path.name}
                    {path.popular && (
                      <span className="ml-1.5 rounded-sm border border-emerald-500/40 px-1 py-0.5 text-[8px] tracking-wider">
                        {t("PRICING.CARD.POPULAR")}
                      </span>
                    )}
                  </span>
                  <span className="text-muted-foreground font-mono text-[10px]">
                    {path.tagline}
                  </span>
                </div>
              ))}
            </div>

            {rows.map((row) => (
              <div
                key={row.key}
                className="border-border/40 grid items-center gap-3 border-b py-3"
                style={gridCols}
              >
                <span className="text-muted-foreground font-mono text-xs">
                  {row.label}
                </span>
                {paths.map((path) => (
                  <div
                    key={path.key}
                    className={cn(
                      "px-2 text-center font-mono text-sm",
                      path.popular && "bg-emerald-500/5",
                    )}
                  >
                    {path.cell(row.key)}
                  </div>
                ))}
              </div>
            ))}

            <div className="grid items-start gap-3 pt-5" style={gridCols}>
              <span />
              {paths.map((path) => (
                <div
                  key={path.key}
                  className={cn(
                    "px-2",
                    path.popular && "bg-emerald-500/5 pb-2",
                  )}
                >
                  {path.action}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile: each path stacked as its own block. */}
        <div className="flex flex-col gap-5 md:hidden">
          {paths.map((path) => (
            <div
              key={path.key}
              className={cn(
                "bg-card flex flex-col rounded-lg border p-5",
                path.popular ? "border-emerald-500/50" : "border-border",
              )}
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "font-mono text-xs font-bold tracking-widest uppercase",
                    path.popular || path.key === "topup"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-foreground",
                  )}
                >
                  {path.name}
                </span>
                {path.popular && (
                  <span className="rounded-sm border border-emerald-500/40 px-1.5 py-0.5 font-mono text-[9px] tracking-wider text-emerald-600 uppercase dark:text-emerald-400">
                    {t("PRICING.CARD.POPULAR")}
                  </span>
                )}
              </div>
              <ul className="flex flex-col gap-2.5">
                {rows.map((row) => (
                  <li
                    key={row.key}
                    className="flex items-center justify-between gap-3 font-mono text-xs"
                  >
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="text-right">{path.cell(row.key)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5">{path.action}</div>
            </div>
          ))}
        </div>

        <p className="text-muted-foreground mx-auto mt-8 max-w-xl text-center font-mono text-[11px] leading-relaxed">
          {t("PRICING.MATRIX.FOOTNOTE")}
        </p>
      </div>
    </section>
  );
}
