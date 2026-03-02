"use client";

import { usePricingQuery } from "@/hooks/pricing-hook";
import { useSubscriptionPlansQuery } from "@/hooks/subscription-hook";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { useTranslations } from "next-intl";
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
    <section className="relative z-10 py-24 border-t border-border/50 bg-linear-to-b from-background to-card">
      <div className="max-w-360 mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-purple-500/30 bg-purple-500/10 rounded-sm mb-6">
            <LuZap className="h-3 w-3 text-purple-400" />
            <span className="text-[10px] font-mono text-purple-400 tracking-[0.2em] uppercase">
              {t("HOME.PRICING_LABEL")}
            </span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground leading-[1.1] tracking-tight mb-4">
            {t("HOME.PRICING_TITLE")}
            <br />
            <span className="text-muted-foreground">
              {t("HOME.PRICING_SUBTITLE")}
            </span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto font-mono text-sm leading-relaxed">
            {t("HOME.PRICING_DESCRIPTION")}
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          <PricingTile
            name={t("HOME.PRICING_PAYG_NAME")}
            price={t("HOME.PRICING_PAYG_PRICE")}
            description={t("HOME.PRICING_PAYG_DESC")}
            endpoint={t("HOME.PRICING_PAYG_ENDPOINT")}
          />
          {plans.map((plan, i) => {
            const multiplier = plan.priceAmount > 0
              ? Math.round(plan.estimatedTotalUsd / plan.priceAmount)
              : 0;
            const resetLabel = plan.quotaResetPeriod === "weekly" ? "week"
              : plan.quotaResetPeriod === "daily" ? "day"
              : plan.quotaResetPeriod === "monthly" ? "month"
              : "period";
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
        </div>

        {/* Feature details */}
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-bold text-foreground mb-4 font-mono">
                {t("HOME.FEATURES_TITLE")}
              </h3>
              <p className="text-muted-foreground font-mono text-sm leading-relaxed mb-6">
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

            <div className="flex flex-col sm:flex-row items-start gap-4 pt-4">
              <a
                href="https://api.unorouter.ai/register"
                className="h-11 px-8 bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2"
              >
                <LuZap className="h-3.5 w-3.5" />
                {t("HOME.PRICING_CTA_GET_STARTED")}
              </a>
              <Link
                href="/pricing"
                className="h-11 px-6 bg-transparent border border-border text-foreground font-mono text-xs font-bold uppercase tracking-widest hover:border-foreground transition-all flex items-center gap-2"
              >
                {t("HOME.PRICING_CTA_VIEW_PLANS")}
              </Link>
            </div>
          </div>

          {/* Info panels */}
          <div className="space-y-6">
            <div className="w-full bg-card border border-border rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-purple-500/10 border-b border-purple-500/20">
                <span className="text-[10px] text-purple-400 uppercase tracking-wider font-mono">
                  {t("HOME.PRICING_PROVIDERS_TITLE")}
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] text-green-400 font-mono">
                    {t("HOME.PRICING_PROVIDERS_ACTIVE")}
                  </span>
                </div>
              </div>
              <div className="p-4 space-y-3">
                {vendors.map((vendor) => {
                  const theme = getVendorTheme(vendor.name);
                  return (
                    <div
                      key={vendor.name}
                      className={`${theme.bg} border ${theme.border} rounded-lg p-3.5 space-y-2`}
                    >
                      <div className="flex items-center gap-2.5">
                        {theme.icon && (
                          <Image
                            src={theme.icon}
                            alt={vendor.name}
                            width={16}
                            height={16}
                            className="w-4 h-4 rounded object-contain shrink-0 invert dark:invert-0"
                          />
                        )}
                        <span className="font-mono text-xs text-foreground font-bold uppercase tracking-wide">
                          {vendor.name}
                        </span>
                        <span className={`text-[10px] font-mono ${theme.text}`}>
                          {vendor.modelCount}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {vendor.models.map((model: { name: string }) => (
                          <span
                            key={model.name}
                            className={`text-[10px] font-mono ${theme.text} ${theme.tagBg} px-2 py-0.5 rounded-sm`}
                          >
                            {model.name}
                          </span>
                        ))}
                        {vendor.modelCount > 3 && (
                          <span className={`text-[10px] font-mono ${theme.text} opacity-60 px-1 py-0.5`}>
                            +{vendor.modelCount - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="w-full bg-card border border-border rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-secondary border-b border-border">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">
                  {t("HOME.PRICING_FLOW_TITLE")}
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                  <span className="text-[10px] text-purple-400 font-mono">
                    {t("HOME.PRICING_FLOW_LIVE")}
                  </span>
                </div>
              </div>
              <div className="p-4 space-y-3 font-mono text-xs">
                <FlowStep step="1" text={t("HOME.PRICING_FLOW_STEP1")} />
                <FlowStep step="2" text={t("HOME.PRICING_FLOW_STEP2")} muted />
                <FlowStep step="✓" text={t("HOME.PRICING_FLOW_STEP3")} success />
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
      className={`p-5 bg-accent border rounded-lg hover:border-purple-500/50 transition-all group ${props.highlight ? "border-purple-500/50" : "border-border"}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-xs text-foreground uppercase tracking-wide">
          {props.name}
        </span>
        <span className="text-purple-400 font-mono text-sm font-bold">
          {props.price}
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground font-mono leading-relaxed mb-3">
        {props.description}
      </p>
      <code className="text-[9px] text-muted-foreground bg-muted px-2 py-1 rounded block truncate">
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
    <div className="flex items-center gap-4 text-sm text-foreground group">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-secondary border border-border group-hover:border-purple-500/50 transition-colors">
        {props.icon}
      </div>
      <div>
        <span className="font-mono text-xs uppercase tracking-wide block">
          {props.title}
        </span>
        <span className="text-[10px] text-muted-foreground">{props.description}</span>
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
        className={`w-5 h-5 rounded-full ${bgColor} flex items-center justify-center ${textColor} text-[9px] font-bold`}
      >
        {props.step}
      </div>
      <div className="flex-1">
        <span className={`${labelColor} text-[11px]`}>{props.text}</span>
      </div>
    </div>
  );
}
