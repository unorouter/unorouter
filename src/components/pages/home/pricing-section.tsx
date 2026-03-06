"use client";

import { usePricingQuery } from "@/hooks/pricing-hook";
import { useSubscriptionPlansQuery } from "@/hooks/subscription-hook";
import { Link } from "@/i18n/navigation";
import { getMultiplier, getResetLabel } from "@/lib/api/subscription";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { LuActivity, LuGlobe, LuShield, LuZap } from "react-icons/lu";

type VendorTheme = {
  icon: string;
  bg: string;
  border: string;
  text: string;
  tagBg: string;
};

const VENDOR_THEMES: Record<string, VendorTheme> = {
  openai: {
    icon: "/icons/openai.svg",
    bg: "bg-green-500/5",
    border: "border-green-500/20",
    text: "text-green-400",
    tagBg: "bg-green-500/10",
  },
  anthropic: {
    icon: "/icons/anthropic.svg",
    bg: "bg-orange-500/5",
    border: "border-orange-500/20",
    text: "text-orange-400",
    tagBg: "bg-orange-500/10",
  },
  google: {
    icon: "/icons/google.svg",
    bg: "bg-blue-500/5",
    border: "border-blue-500/20",
    text: "text-blue-400",
    tagBg: "bg-blue-500/10",
  },
  "google deepmind": {
    icon: "/icons/google.svg",
    bg: "bg-blue-500/5",
    border: "border-blue-500/20",
    text: "text-blue-400",
    tagBg: "bg-blue-500/10",
  },
  deepseek: {
    icon: "/icons/deepseek.svg",
    bg: "bg-purple-500/5",
    border: "border-purple-500/20",
    text: "text-purple-400",
    tagBg: "bg-purple-500/10",
  },
  meta: {
    icon: "/icons/meta.svg",
    bg: "bg-sky-500/5",
    border: "border-sky-500/20",
    text: "text-sky-400",
    tagBg: "bg-sky-500/10",
  },
  mistral: {
    icon: "/icons/mistral.svg",
    bg: "bg-amber-500/5",
    border: "border-amber-500/20",
    text: "text-amber-400",
    tagBg: "bg-amber-500/10",
  },
  "mistral ai": {
    icon: "/icons/mistral.svg",
    bg: "bg-amber-500/5",
    border: "border-amber-500/20",
    text: "text-amber-400",
    tagBg: "bg-amber-500/10",
  },
  cohere: {
    icon: "/icons/cohere.svg",
    bg: "bg-rose-500/5",
    border: "border-rose-500/20",
    text: "text-rose-400",
    tagBg: "bg-rose-500/10",
  },
  xai: {
    icon: "/icons/x.svg",
    bg: "bg-zinc-500/5",
    border: "border-zinc-500/20",
    text: "text-zinc-400",
    tagBg: "bg-zinc-500/10",
  },
  "x.ai": {
    icon: "/icons/x.svg",
    bg: "bg-zinc-500/5",
    border: "border-zinc-500/20",
    text: "text-zinc-400",
    tagBg: "bg-zinc-500/10",
  },
  moonshot: {
    icon: "/icons/moonshot.svg",
    bg: "bg-indigo-500/5",
    border: "border-indigo-500/20",
    text: "text-indigo-400",
    tagBg: "bg-indigo-500/10",
  },
};

const DEFAULT_THEME: VendorTheme = {
  icon: "",
  bg: "bg-muted/30",
  border: "border-border",
  text: "text-muted-foreground",
  tagBg: "bg-secondary",
};

function getVendorTheme(vendor: string): VendorTheme {
  const normalized = vendor.toLowerCase();
  for (const [key, theme] of Object.entries(VENDOR_THEMES)) {
    if (normalized.includes(key)) return theme;
  }
  return DEFAULT_THEME;
}

export function PricingSection() {
  const t = useTranslations();
  const { data } = useSubscriptionPlansQuery();
  const { data: pricingData } = usePricingQuery();
  const plans = data?.plans ?? [];
  const vendors = pricingData?.vendors ?? [];

  return (
    <section className="border-border/50 from-background to-card relative z-10 border-t bg-linear-to-b py-24">
      <div className="mx-auto max-w-360 px-6">
        <div className="mb-16 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-sm border border-purple-500/30 bg-purple-500/10 px-3 py-1.5">
            <LuZap className="h-3 w-3 text-purple-400" />
            <span className="textpriceAmount >-[10px] font-mono tracking-[0.2em] text-purple-400 uppercase">
              {t("HOME.PRICING_LABEL")}
            </span>
          </div>
          <h2 className="text-foreground mb-4 text-3xl leading-[1.1] font-bold tracking-tight md:text-5xl">
            {t("HOME.PRICING_TITLE")}
            <br />
            <span className="text-muted-foreground">
              {t("HOME.PRICING_SUBTITLE")}
            </span>
          </h2>
          <p className="text-muted-foreground mx-auto max-w-2xl font-mono text-sm leading-relaxed">
            {t("HOME.PRICING_DESCRIPTION")}
          </p>
        </div>

        {/* Pricing cards */}
        <Link
          href="/pricing"
          className="mb-16 grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        >
          <PricingTile
            name={t("HOME.PRICING_PAYG_NAME")}
            price={t("HOME.PRICING_PAYG_PRICE")}
            description={t("HOME.PRICING_PAYG_DESC")}
            endpoint={t("HOME.PRICING_PAYG_ENDPOINT")}
          />
          {plans.map((plan, i) => {
            const multiplier = getMultiplier(plan);
            const resetLabel = getResetLabel(plan);
            return (
              <PricingTile
                key={plan.id}
                name={plan.title}
                price={`$${plan.priceAmount}/mo`}
                description={`~$${plan.estimatedTotalUsd} credit value. ${multiplier}x multiplier.`}
                endpoint={`$${plan.quotaPerResetUsd}/${resetLabel}`}
                highlight={i === 0}
              />
            );
          })}
        </Link>

        {/* Feature details */}
        <div className="grid items-start gap-16 lg:grid-cols-2">
          <div className="space-y-8">
            <div>
              <h3 className="text-foreground mb-4 font-mono text-xl font-bold">
                {t("HOME.FEATURES_TITLE")}
              </h3>
              <p className="text-muted-foreground mb-6 font-mono text-sm leading-relaxed">
                {t("HOME.FEATURES_DESCRIPTION")}
              </p>
            </div>

            <div className="space-y-4">
              <FeatureRow
                icon={<LuShield className="h-3.5 w-3.5 text-purple-400" />}
                title={t("HOME.FEATURE_FAILOVER_TITLE")}
                description={t("HOME.FEATURE_FAILOVER_DESC")}
              />
              <FeatureRow
                icon={<LuGlobe className="h-3.5 w-3.5 text-purple-400" />}
                title={t("HOME.FEATURE_MULTIPROTOCOL_TITLE")}
                description={t("HOME.FEATURE_MULTIPROTOCOL_DESC")}
              />
              <FeatureRow
                icon={<LuActivity className="h-3.5 w-3.5 text-purple-400" />}
                title={t("HOME.FEATURE_LOADBALANCE_TITLE")}
                description={t("HOME.FEATURE_LOADBALANCE_DESC")}
              />
            </div>

            <div className="flex flex-col items-start gap-4 pt-4 sm:flex-row">
              <a
                href="https://api.unorouter.ai/register"
                className="flex h-11 items-center gap-2 bg-purple-600 px-8 font-mono text-xs font-bold tracking-widest text-white uppercase transition-colors hover:bg-purple-500"
              >
                <LuZap className="h-3.5 w-3.5" />
                {t("HOME.PRICING_CTA_GET_STARTED")}
              </a>
              <Link
                href="/pricing"
                className="border-border text-foreground hover:border-foreground flex h-11 items-center gap-2 border bg-transparent px-6 font-mono text-xs font-bold tracking-widest uppercase transition-all"
              >
                {t("HOME.PRICING_CTA_VIEW_PLANS")}
              </Link>
            </div>
          </div>

          {/* Info panels */}
          <div className="space-y-6">
            <div className="bg-card border-border w-full overflow-hidden rounded-lg border">
              <div className="flex items-center justify-between border-b border-purple-500/20 bg-purple-500/10 px-4 py-3">
                <span className="font-mono text-[10px] tracking-wider text-purple-400 uppercase">
                  {t("HOME.PRICING_PROVIDERS_TITLE")}
                </span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
                  <span className="font-mono text-[10px] text-green-400">
                    {t("HOME.PRICING_PROVIDERS_ACTIVE")}
                  </span>
                </div>
              </div>
              <div className="space-y-3 p-4">
                {vendors.map((vendor) => {
                  const theme = getVendorTheme(vendor.name);
                  return (
                    <div
                      key={vendor.name}
                      className={`${theme.bg} border ${theme.border} space-y-2 rounded-lg p-3.5`}
                    >
                      <div className="flex items-center gap-2.5">
                        {theme.icon && (
                          <Image
                            src={theme.icon}
                            alt={vendor.name}
                            width={16}
                            height={16}
                            className="h-4 w-4 shrink-0 rounded object-contain invert dark:invert-0"
                          />
                        )}
                        <span className="text-foreground font-mono text-xs font-bold tracking-wide uppercase">
                          {vendor.name}
                        </span>
                        <span className={`font-mono text-[10px] ${theme.text}`}>
                          {vendor.modelCount}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {vendor.models.map((model) => (
                          <span
                            key={model.name}
                            className={`font-mono text-[10px] ${theme.text} ${theme.tagBg} rounded-sm px-2 py-0.5`}
                          >
                            {model.name}
                          </span>
                        ))}
                        {vendor.modelCount > 3 && (
                          <span
                            className={`font-mono text-[10px] ${theme.text} px-1 py-0.5 opacity-60`}
                          >
                            +{vendor.modelCount - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-card border-border w-full overflow-hidden rounded-lg border">
              <div className="bg-secondary border-border flex items-center justify-between border-b px-4 py-3">
                <span className="text-muted-foreground font-mono text-[10px] tracking-wider uppercase">
                  {t("HOME.PRICING_FLOW_TITLE")}
                </span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-purple-500" />
                  <span className="font-mono text-[10px] text-purple-400">
                    {t("HOME.PRICING_FLOW_LIVE")}
                  </span>
                </div>
              </div>
              <div className="space-y-3 p-4 font-mono text-xs">
                <FlowStep step="1" text={t("HOME.PRICING_FLOW_STEP1")} />
                <FlowStep step="2" text={t("HOME.PRICING_FLOW_STEP2")} muted />
                <FlowStep
                  step="✓"
                  text={t("HOME.PRICING_FLOW_STEP3")}
                  success
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PricingTile(props: {
  name: string;
  price: string;
  description: string;
  endpoint: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`bg-accent group rounded-lg border p-5 transition-all hover:border-purple-500/50 ${props.highlight ? "border-purple-500/50" : "border-border"}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-foreground font-mono text-xs tracking-wide uppercase">
          {props.name}
        </span>
        <span className="font-mono text-sm font-bold text-purple-400">
          {props.price}
        </span>
      </div>
      <p className="text-muted-foreground mb-3 font-mono text-[11px] leading-relaxed">
        {props.description}
      </p>
      <code className="text-muted-foreground bg-muted block truncate rounded px-2 py-1 text-[9px]">
        {props.endpoint}
      </code>
    </div>
  );
}

function FeatureRow(props: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="text-foreground group flex items-center gap-4 text-sm">
      <div className="bg-secondary border-border flex h-8 w-8 items-center justify-center rounded-lg border transition-colors group-hover:border-purple-500/50">
        {props.icon}
      </div>
      <div>
        <span className="block font-mono text-xs tracking-wide uppercase">
          {props.title}
        </span>
        <span className="text-muted-foreground text-[10px]">
          {props.description}
        </span>
      </div>
    </div>
  );
}

function FlowStep(props: {
  step: string;
  text: string;
  muted?: boolean;
  success?: boolean;
}) {
  const bgColor = props.success ? "bg-green-500/20" : "bg-purple-500/20";
  const textColor = props.success ? "text-green-400" : "text-purple-400";
  const labelColor = props.success
    ? "text-green-400"
    : props.muted
      ? "text-muted-foreground"
      : "text-foreground";

  return (
    <div className="flex items-center gap-3">
      <div
        className={`h-5 w-5 rounded-full ${bgColor} flex items-center justify-center ${textColor} text-[9px] font-bold`}
      >
        {props.step}
      </div>
      <div className="flex-1">
        <span className={`${labelColor} text-[11px]`}>{props.text}</span>
      </div>
    </div>
  );
}
