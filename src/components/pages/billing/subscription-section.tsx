"use client";

import { quotaToDollars } from "@/lib/config/constants";
import {
  useBillingPlansQuery,
  useSubscriptionSelfQuery,
  useUpdateBillingPreferenceMutation,
  useStripeSubscriptionMutation,
  useCreemSubscriptionMutation,
  useTopUpInfoQuery,
} from "@/hooks/billing-hook";
import { getMultiplier } from "@/lib/api/subscription";
import type { SubscriptionPlan } from "@/lib/api/subscription";
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
import { useTranslations } from "next-intl";
import { LuSparkles, LuRefreshCw } from "react-icons/lu";
import { toast } from "sonner";

const PREFERENCE_OPTIONS = [
  { value: "wallet_first", key: "BILLING.WALLET_FIRST" },
  { value: "wallet_only", key: "BILLING.WALLET_ONLY" },
  { value: "subscription_first", key: "BILLING.SUBSCRIPTION_FIRST" },
  { value: "subscription_only", key: "BILLING.SUBSCRIPTION_ONLY" },
] as const;

function formatResetPeriod(period: string, t: (key: any) => string): string {
  switch (period) {
    case "weekly": return t("BILLING.WEEKLY");
    case "daily": return t("BILLING.DAILY");
    case "monthly": return t("BILLING.MONTHLY");
    default: return period;
  }
}

function getPerPeriodSuffix(period: string, t: (key: any) => string): string {
  switch (period) {
    case "weekly": return t("BILLING.PER_WEEK");
    case "daily": return t("BILLING.PER_DAY");
    case "monthly": return t("BILLING.PER_MONTH");
    default: return "";
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

  const plans = (plansQuery.data ?? []) as SubscriptionPlan[];
  const selfData = selfQuery.data as
    | {
        billing_preference?: string;
        subscriptions?: Array<{
          subscription: {
            id: number;
            plan_id: number;
            status: string;
            amount_total: number;
            amount_used: number;
            start_time: number;
            end_time: number;
          } | null;
        }>;
        all_subscriptions?: Array<{
          subscription: {
            id: number;
            plan_id: number;
            status: string;
            amount_total: number;
            amount_used: number;
            start_time: number;
            end_time: number;
          } | null;
        }>;
      }
    | undefined;

  const topUpInfo = topUpInfoQuery.data as
    | {
        enable_stripe_topup?: boolean;
        enable_creem_topup?: boolean;
      }
    | undefined;

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
    if (value) preferenceMutation.mutate(value);
  }

  function handleSubscribe(plan: SubscriptionPlan) {
    if (enableStripe) {
      stripeSubMutation.mutate(plan.id, {
        onSuccess: (data: unknown) => {
          const link = (data as { pay_link?: string })?.pay_link;
          if (link) window.open(link, "_blank");
        },
        onError: () => {
          toast.error("Payment failed. Please try again.");
        },
      });
    } else if (enableCreem) {
      creemSubMutation.mutate(plan.id, {
        onSuccess: (data: unknown) => {
          const url = (data as { checkout_url?: string })?.checkout_url;
          if (url) window.open(url, "_blank");
        },
        onError: () => {
          toast.error("Payment failed. Please try again.");
        },
      });
    }
  }

  function getPlanTitle(planId: number): string {
    const plan = plans.find((p) => p.id === planId);
    return plan?.title ?? `Plan #${planId}`;
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
            {t("BILLING.MY_SUBSCRIPTIONS")}
          </h2>
          <Badge variant={hasActive ? "default" : "secondary"}>
            {hasActive ? t("BILLING.ACTIVE") : t("BILLING.NO_ACTIVE")}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={billingPreference}
            onValueChange={handlePreferenceChange}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PREFERENCE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {t(opt.key as any)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => selfQuery.refetch()}
            disabled={selfQuery.isFetching}
          >
            <LuRefreshCw
              className={`h-4 w-4 ${selfQuery.isFetching ? "animate-spin" : ""}`}
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
            const percentage = total > 0 ? Math.min((used / total) * 100, 100) : 0;
            const endDate = new Date(sub.end_time * 1000).toLocaleDateString();

            return (
              <div key={sub.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-foreground text-sm font-medium">
                      {getPlanTitle(sub.plan_id)}
                    </span>
                    <Badge variant={isActive ? "default" : "secondary"} className="text-[10px]">
                      {isActive ? t("BILLING.ACTIVE") : t("BILLING.EXPIRED")}
                    </Badge>
                  </div>
                  <span className="text-muted-foreground font-mono text-xs">
                    ${used.toFixed(2)} {t("BILLING.USED_OF")} ${total.toFixed(2)}
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
            const periodSuffix = getPerPeriodSuffix(plan.quotaResetPeriod, t);
            const isMutating =
              stripeSubMutation.isPending || creemSubMutation.isPending;

            return (
              <div
                key={plan.id}
                className={`border-border relative flex flex-col border p-6 transition-colors hover:border-primary/50 ${
                  i === 0 ? "border-primary/50" : ""
                }`}
              >
                {i === 0 && (
                  <div className="absolute top-3 right-3">
                    <Badge className="gap-1 bg-primary/10 text-primary">
                      <LuSparkles className="h-3 w-3" />
                      {t("BILLING.RECOMMENDED")}
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
                    {t("BILLING.VALIDITY")}: {plan.durationValue}{" "}
                    {plan.durationValue === 1
                      ? t("BILLING.MONTH")
                      : t("BILLING.MONTHS")}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-muted-foreground/20 inline-block h-1.5 w-1.5 rounded-full" />
                    {t("BILLING.QUOTA_RESET")}:{" "}
                    {formatResetPeriod(plan.quotaResetPeriod, t)}
                  </div>
                  {quotaUsd > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="bg-muted-foreground/20 inline-block h-1.5 w-1.5 rounded-full" />
                      {t("BILLING.TOTAL_QUOTA")}: ${quotaUsd.toFixed(2)}
                      {periodSuffix}
                    </div>
                  )}
                  {multiplier > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="bg-muted-foreground/20 inline-block h-1.5 w-1.5 rounded-full" />
                      {t("BILLING.EST_TOTAL_QUOTA")}: ~$
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
                    {t("BILLING.SUBSCRIBE_NOW")}
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
