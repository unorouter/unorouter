"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useBillingPlansQuery,
  useBillingPortalMutation,
  useSubscriptionSelfQuery,
  useTopUpInfoQuery,
  useUpdateBillingPreferenceMutation,
} from "@/hooks/billing/billing-hook";
import { useBillingActions } from "@/hooks/ui/use-billing-actions";
import { analytics } from "@/lib/analytics";
import {
  BILLING_PREFERENCE_OPTIONS,
  RESET_PERIOD_LABEL_KEYS,
  RESET_TRANSLATION_KEYS,
} from "@/lib/api/subscription";
import { quotaToDollars } from "@/lib/config/constants";
import { dayjs } from "@/lib/utils/format/date";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

const EXPIRED_RETENTION_DAYS = 30;

export function SubscriptionSection() {
  const t = useTranslations();
  const plansQuery = useBillingPlansQuery();
  const selfQuery = useSubscriptionSelfQuery();
  const topUpInfoQuery = useTopUpInfoQuery();
  const preferenceMutation = useUpdateBillingPreferenceMutation();
  const portalMutation = useBillingPortalMutation();
  const billing = useBillingActions();

  const plans = plansQuery.data ?? [];
  const selfData = selfQuery.data;

  const billingPreference = selfData?.billing_preference ?? "wallet_first";
  const activeSubscriptions = (selfData?.subscriptions ?? []).filter(
    (s) => s.subscription && s.subscription.status === "active",
  );
  const expiredCutoff = dayjs().subtract(EXPIRED_RETENTION_DAYS, "day");
  const allSubscriptions = (selfData?.all_subscriptions ?? []).filter(
    (item) => {
      const sub = item.subscription;
      if (!sub) return false;
      if (sub.status === "active") return true;
      return dayjs.unix(sub.end_time).isAfter(expiredCutoff);
    },
  );
  const primarySubscription = activeSubscriptions[0]?.subscription;

  function handlePreferenceChange(value: string | null) {
    if (value) {
      analytics.billing.preferenceUpdated(value);
      preferenceMutation.mutate({ body: { billing_preference: value } });
    }
  }

  function getPlanTitle(planId: number): string {
    const plan = plans.find((p) => p.plan.id === planId);
    return (
      plan?.plan.title ?? t("BILLING.SUBSCRIPTION.PLAN_FALLBACK", { planId })
    );
  }

  function handleManageBilling() {
    analytics.billing.portalOpened();
    portalMutation.mutate(undefined, {
      onSuccess: (data) => {
        const url = data?.portal_url;
        if (url) window.open(url, "_blank");
        else toast.error(t("BILLING.PORTAL.ERROR"));
      },
      onError: () => {
        toast.error(t("BILLING.PORTAL.ERROR"));
      },
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <span className="text-muted-foreground block font-mono text-[10px] tracking-widest uppercase">
            {t("BILLING.SUBSCRIPTION.CURRENT_PLAN")}
          </span>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-foreground text-lg font-bold tracking-tight">
              {primarySubscription
                ? getPlanTitle(primarySubscription.plan_id)
                : t("BILLING.SUBSCRIPTION.NO_ACTIVE_PLAN")}
            </span>
            {primarySubscription && (
              <Badge variant="default">
                {t("BILLING.SUBSCRIPTION.ACTIVE")}
              </Badge>
            )}
          </div>
          {primarySubscription && (
            <span className="text-muted-foreground mt-1 block font-mono text-xs">
              {t("BILLING.SUBSCRIPTION.RENEWS_ON", {
                date: dayjs
                  .unix(primarySubscription.end_time)
                  .format("MMM D, YYYY"),
              })}
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Select
            value={billingPreference}
            onValueChange={handlePreferenceChange}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue>
                {t(
                  BILLING_PREFERENCE_OPTIONS.find(
                    (o) => o.value === billingPreference,
                  )?.key ?? BILLING_PREFERENCE_OPTIONS[0].key,
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {BILLING_PREFERENCE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {t(opt.key)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleManageBilling}
            disabled={portalMutation.isPending}
          >
            <Icon name="external-link" className="h-4 w-4" />
            {t("BILLING.PORTAL.MANAGE")}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              analytics.billing.refreshed();
              selfQuery.refetch();
              plansQuery.refetch();
              topUpInfoQuery.refetch();
            }}
            disabled={
              selfQuery.isFetching ||
              plansQuery.isFetching ||
              topUpInfoQuery.isFetching
            }
          >
            <Icon
              name="refresh-cw"
              className={`h-4 w-4 ${selfQuery.isFetching || plansQuery.isFetching || topUpInfoQuery.isFetching ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      {allSubscriptions.length > 0 && (
        <div className="border-border space-y-3 border p-4">
          {allSubscriptions.map((item) => {
            const sub = item.subscription;
            if (!sub) return null;
            const isActive = sub.status === "active";
            const total = quotaToDollars(sub.amount_total);
            const used = quotaToDollars(sub.amount_used);
            const percentage =
              total > 0 ? Math.min((used / total) * 100, 100) : 0;
            const endDate = dayjs.unix(sub.end_time).format("MMM D, YYYY");
            const resetMoment = dayjs.unix(sub.next_reset_time);
            const showResetBadge =
              isActive &&
              sub.next_reset_time > 0 &&
              resetMoment.isAfter(dayjs());
            const resetRelative = showResetBadge
              ? resetMoment.fromNow(true)
              : "";
            const resetAbsolute = showResetBadge
              ? resetMoment.format("MMM D, HH:mm")
              : "";

            return (
              <div key={sub.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-foreground text-sm font-medium">
                      {getPlanTitle(sub.plan_id)}
                    </span>
                    <Badge
                      variant={isActive ? "default" : "secondary"}
                      className="text-[10px]"
                    >
                      {isActive
                        ? t("BILLING.SUBSCRIPTION.ACTIVE")
                        : t("BILLING.SUBSCRIPTION.EXPIRED")}
                    </Badge>
                    {showResetBadge && (
                      <Badge
                        variant="secondary"
                        className="gap-1 text-[10px]"
                        title={`${t("BILLING.SUBSCRIPTION.RESETS_AT")} ${resetAbsolute}`}
                      >
                        <Icon name="rotate-cw" className="h-3 w-3" />
                        {t("BILLING.SUBSCRIPTION.RESETS_IN")} {resetRelative}
                      </Badge>
                    )}
                  </div>
                  <span className="text-muted-foreground font-mono text-xs">
                    ${used.toFixed(2)} {t("BILLING.USED_OF")} $
                    {total.toFixed(2)}
                  </span>
                </div>
                <Progress value={percentage} className="h-2" />
                <span className="text-muted-foreground block text-right font-mono text-[10px]">
                  {endDate}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {plans.length > 0 && (
        <div className="space-y-3">
          <span className="text-muted-foreground block font-mono text-[10px] tracking-widest uppercase">
            {t("BILLING.SECTIONS.SUBSCRIPTION_PLANS")}
          </span>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {plans.map((plan, i) => {
              const recommended = i === Math.floor((plans.length - 1) / 2);
              const multiplier =
                plan.plan.price_amount > 0
                  ? Math.round(
                      plan.estimated_total_usd / plan.plan.price_amount,
                    )
                  : 0;
              const quotaUsd = plan.quota_per_reset_usd;
              const periodSuffix =
                RESET_TRANSLATION_KEYS[plan.plan.quota_reset_period];
              const isMutating = billing.isSubMutating;

              return (
                <div
                  key={plan.plan.id}
                  className={`border-border hover:border-primary/50 relative flex flex-col border p-6 transition-colors ${
                    recommended ? "border-primary/50 bg-primary/2" : ""
                  }`}
                >
                  {recommended && (
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-primary/10 text-primary gap-1">
                        <Icon name="sparkles" className="h-3 w-3" />
                        {t("BILLING.SUBSCRIPTION.RECOMMENDED")}
                      </Badge>
                    </div>
                  )}

                  <h3 className="text-foreground text-sm font-bold">
                    {plan.plan.title}
                  </h3>

                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-muted-foreground text-sm">$</span>
                    <span className="text-foreground text-3xl font-bold tabular-nums">
                      {plan.plan.price_amount}
                    </span>
                  </div>

                  <div className="text-muted-foreground mt-4 space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="bg-muted-foreground/20 inline-block h-1.5 w-1.5 rounded-full" />
                      {t("BILLING.SUBSCRIPTION.VALIDITY")}:{" "}
                      {plan.plan.duration_value}{" "}
                      {plan.plan.duration_value === 1
                        ? t("BILLING.SUBSCRIPTION.MONTH")
                        : t("BILLING.SUBSCRIPTION.MONTHS")}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bg-muted-foreground/20 inline-block h-1.5 w-1.5 rounded-full" />
                      {t("BILLING.SUBSCRIPTION.QUOTA_RESET")}:{" "}
                      {RESET_PERIOD_LABEL_KEYS[plan.plan.quota_reset_period]
                        ? t(
                            RESET_PERIOD_LABEL_KEYS[
                              plan.plan.quota_reset_period
                            ],
                          )
                        : plan.plan.quota_reset_period}
                    </div>
                    {quotaUsd > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="bg-muted-foreground/20 inline-block h-1.5 w-1.5 rounded-full" />
                        {t("BILLING.SUBSCRIPTION.TOTAL_QUOTA")}: $
                        {quotaUsd.toFixed(2)}
                        {t(periodSuffix)}
                      </div>
                    )}
                    {multiplier > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="bg-muted-foreground/20 inline-block h-1.5 w-1.5 rounded-full" />
                        {t("BILLING.SUBSCRIPTION.EST_TOTAL_QUOTA")}: ~$
                        {plan.estimated_total_usd.toFixed(2)}
                      </div>
                    )}
                    {/* Read from the plan rather than the card's position: the
                        pricing page derives it from a tier index, which silently
                        mislabels every plan once one is added or reordered. */}
                    {plan.plan.free_rate_limit_window_pct > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="bg-muted-foreground/20 inline-block h-1.5 w-1.5 rounded-full" />
                        {plan.plan.free_rate_limit_window_pct >= 100
                          ? t("PRICING.FEATURE.NO_FREE_WAIT")
                          : t("PRICING.FEATURE.FREE_WAIT", {
                              percent: String(
                                plan.plan.free_rate_limit_window_pct,
                              ),
                            })}
                      </div>
                    )}
                  </div>

                  <div className="mt-auto pt-6">
                    <Button
                      variant={i === 0 ? "default" : "outline"}
                      className="w-full"
                      onClick={() =>
                        billing.subscribe(plan, { isLoggedIn: true })
                      }
                      disabled={
                        isMutating ||
                        (!billing.enableStripe &&
                          !billing.enableCreem &&
                          !billing.enableNowPayments)
                      }
                    >
                      {t("BILLING.SUBSCRIPTION.SUBSCRIBE_NOW")}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
