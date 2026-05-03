"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useBillingPlansQuery,
  useBillingPortalMutation,
  useCreemSubscriptionMutation,
  useStripeSubscriptionMutation,
  useSubscriptionSelfQuery,
  useTopUpInfoQuery,
  useUpdateBillingPreferenceMutation,
} from "@/hooks/billing-hook";
import { analytics } from "@/lib/analytics";
import type { SubscriptionPlan } from "@/lib/api/subscription";
import { getMultiplier } from "@/lib/api/subscription";
import { msg, quotaToDollars, TranslationKey } from "@/lib/config/constants";
import { dayjs } from "@/lib/utils/date";
import { useTranslations } from "next-intl";
import {
  LuExternalLink,
  LuRefreshCw,
  LuRotateCw,
  LuSparkles,
} from "react-icons/lu";
import { toast } from "sonner";

const PREFERENCE_OPTIONS = [
  { value: "wallet_first", key: msg("BILLING.PREFERENCE.WALLET_FIRST") },
  { value: "wallet_only", key: msg("BILLING.PREFERENCE.WALLET_ONLY") },
  {
    value: "subscription_first",
    key: msg("BILLING.PREFERENCE.SUBSCRIPTION_FIRST"),
  },
  {
    value: "subscription_only",
    key: msg("BILLING.PREFERENCE.SUBSCRIPTION_ONLY"),
  },
] as const;

function formatResetPeriod(period: string): TranslationKey {
  switch (period) {
    case "weekly":
      return msg("BILLING.SUBSCRIPTION.WEEKLY");
    case "daily":
      return msg("BILLING.SUBSCRIPTION.DAILY");
    case "monthly":
      return msg("BILLING.SUBSCRIPTION.MONTHLY");
    default:
      return period as TranslationKey;
  }
}

function getPerPeriodSuffix(period: string): TranslationKey {
  switch (period) {
    case "weekly":
      return msg("BILLING.SUBSCRIPTION.PER_WEEK");
    case "daily":
      return msg("BILLING.SUBSCRIPTION.PER_DAY");
    case "monthly":
      return msg("BILLING.SUBSCRIPTION.PER_MONTH");
    default:
      return "" as TranslationKey;
  }
}

export function SubscriptionSection() {
  const t = useTranslations() as (key: string) => string;
  const plansQuery = useBillingPlansQuery();
  const selfQuery = useSubscriptionSelfQuery();
  const topUpInfoQuery = useTopUpInfoQuery();
  const preferenceMutation = useUpdateBillingPreferenceMutation();
  const stripeSubMutation = useStripeSubscriptionMutation();
  const creemSubMutation = useCreemSubscriptionMutation();
  const portalMutation = useBillingPortalMutation();

  const plans = plansQuery.data ?? [];
  const selfData = selfQuery.data;
  const topUpInfo = topUpInfoQuery.data;

  const billingPreference = selfData?.billing_preference ?? "wallet_first";
  const activeSubscriptions = (selfData?.subscriptions ?? []).filter(
    (s) => s.subscription && s.subscription.status === "active",
  );
  const allSubscriptions = selfData?.all_subscriptions ?? [];
  const hasActive = activeSubscriptions.length > 0;
  const enableStripe = topUpInfo?.enable_stripe_topup ?? false;
  const enableCreem = topUpInfo?.enable_creem_topup ?? false;

  const isLoading = plansQuery.isLoading || selfQuery.isLoading;

  function handlePreferenceChange(value: string | null) {
    if (value) {
      analytics.billing.preferenceUpdated(value);
      preferenceMutation.mutate({ body: { billing_preference: value } });
    }
  }

  function handleSubscribe(plan: SubscriptionPlan) {
    if (enableStripe) {
      analytics.billing.subscriptionInitiated({
        planId: String(plan.id),
        provider: "stripe",
      });
      stripeSubMutation.mutate(
        { body: { plan_id: plan.id } },
        {
          onSuccess: (data) => {
            const link = data?.pay_link;
            if (link) window.open(link, "_blank");
          },
          onError: () => {
            toast.error(t("BILLING.ERROR.PAYMENT_FAILED"));
          },
        },
      );
    } else if (enableCreem) {
      analytics.billing.subscriptionInitiated({
        planId: String(plan.id),
        provider: "creem",
      });
      creemSubMutation.mutate(
        { body: { plan_id: plan.id } },
        {
          onSuccess: (data) => {
            const url = data?.checkout_url;
            if (url) window.open(url, "_blank");
          },
          onError: () => {
            toast.error(t("BILLING.ERROR.PAYMENT_FAILED"));
          },
        },
      );
    }
  }

  function getPlanTitle(planId: number): string {
    const plan = plans.find((p) => p.id === planId);
    return plan?.title ?? `Plan #${planId}`;
  }

  function handleManageBilling() {
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

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with preference */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-foreground text-lg font-bold tracking-tight">
            {t("BILLING.SUBSCRIPTION.MY")}
          </h2>
          <Badge variant={hasActive ? "default" : "secondary"}>
            {hasActive
              ? t("BILLING.SUBSCRIPTION.ACTIVE")
              : t("BILLING.SUBSCRIPTION.NO_ACTIVE")}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={billingPreference}
            onValueChange={handlePreferenceChange}
          >
            <SelectTrigger className="w-48">
              <SelectValue>
                {t(
                  PREFERENCE_OPTIONS.find((o) => o.value === billingPreference)
                    ?.key ?? PREFERENCE_OPTIONS[0].key,
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {PREFERENCE_OPTIONS.map((opt) => (
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
            <LuExternalLink className="h-4 w-4" />
            {t("BILLING.PORTAL.MANAGE")}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
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
            <LuRefreshCw
              className={`h-4 w-4 ${selfQuery.isFetching || plansQuery.isFetching || topUpInfoQuery.isFetching ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      {/* Active subscriptions */}
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
                        <LuRotateCw className="h-3 w-3" />
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

      {/* Plan cards */}
      {plans.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {plans.map((plan, i) => {
            const multiplier = getMultiplier(plan);
            const quotaUsd = plan.quotaPerResetUsd;
            const periodSuffix = getPerPeriodSuffix(plan.quotaResetPeriod);
            const isMutating =
              stripeSubMutation.isPending || creemSubMutation.isPending;

            return (
              <div
                key={plan.id}
                className={`border-border hover:border-primary/50 relative flex flex-col border p-6 transition-colors ${
                  i === 0 ? "border-primary/50" : ""
                }`}
              >
                {i === 0 && (
                  <div className="absolute top-3 right-3">
                    <Badge className="bg-primary/10 text-primary gap-1">
                      <LuSparkles className="h-3 w-3" />
                      {t("BILLING.SUBSCRIPTION.RECOMMENDED")}
                    </Badge>
                  </div>
                )}

                <h3 className="text-foreground text-sm font-bold">
                  {plan.title}
                </h3>

                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-muted-foreground text-sm">$</span>
                  <span className="text-foreground text-3xl font-bold tabular-nums">
                    {plan.priceAmount}
                  </span>
                </div>

                <div className="text-muted-foreground mt-4 space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="bg-muted-foreground/20 inline-block h-1.5 w-1.5 rounded-full" />
                    {t("BILLING.SUBSCRIPTION.VALIDITY")}: {plan.durationValue}{" "}
                    {plan.durationValue === 1
                      ? t("BILLING.SUBSCRIPTION.MONTH")
                      : t("BILLING.SUBSCRIPTION.MONTHS")}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-muted-foreground/20 inline-block h-1.5 w-1.5 rounded-full" />
                    {t("BILLING.SUBSCRIPTION.QUOTA_RESET")}:{" "}
                    {t(formatResetPeriod(plan.quotaResetPeriod))}
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
                      {plan.estimatedTotalUsd.toFixed(2)}
                    </div>
                  )}
                </div>

                <div className="mt-auto pt-6">
                  <Button
                    variant={i === 0 ? "default" : "outline"}
                    className="w-full"
                    onClick={() => handleSubscribe(plan)}
                    disabled={isMutating || (!enableStripe && !enableCreem)}
                  >
                    {t("BILLING.SUBSCRIPTION.SUBSCRIBE_NOW")}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
