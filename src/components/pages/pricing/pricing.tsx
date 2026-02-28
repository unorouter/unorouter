"use client";

import { useTranslations } from "next-intl";
import { PricingCard } from "@/components/elements/pricing-card";
import { CompareTable } from "@/components/pages/pricing/compare-table";

export function Pricing() {
  const t = useTranslations();

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold">{t("PRICING.TITLE")}</h1>
        <p className="text-muted-foreground mt-3 text-lg">{t("PRICING.SUBTITLE")}</p>
      </div>

      {/* Pricing Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <PricingCard
          name={t("PRICING.BASIC_NAME")}
          price={20}
          value={30}
          multiplier="1.5x"
          rateLimit={100}
          features={[
            t("PRICING.FEATURE_MODELS"),
            t("PRICING.FEATURE_SUPPORT"),
          ]}
          cta={t("PRICING.CTA")}
        />
        <PricingCard
          name={t("PRICING.PRO_NAME")}
          price={50}
          value={75}
          multiplier="1.5x"
          rateLimit={500}
          popular
          features={[
            t("PRICING.FEATURE_MODELS"),
            t("PRICING.FEATURE_PRIORITY"),
            t("PRICING.FEATURE_SUPPORT"),
          ]}
          cta={t("PRICING.CTA")}
        />
        <PricingCard
          name={t("PRICING.ENTERPRISE_NAME")}
          price={100}
          value={175}
          multiplier="1.75x"
          rateLimit={2000}
          features={[
            t("PRICING.FEATURE_MODELS"),
            t("PRICING.FEATURE_PRIORITY"),
            t("PRICING.FEATURE_DEDICATED"),
            t("PRICING.FEATURE_SUPPORT"),
          ]}
          cta={t("PRICING.CTA")}
        />
      </div>

      {/* Feature Comparison */}
      <CompareTable
        title={t("PRICING.COMPARE_TITLE")}
        featureLabel={t("PRICING.COMPARE_FEATURE")}
        basicName={t("PRICING.BASIC_NAME")}
        proName={t("PRICING.PRO_NAME")}
        enterpriseName={t("PRICING.ENTERPRISE_NAME")}
        rows={[
          { feature: t("PRICING.COMPARE_PRICE"), basic: t("PRICING.COMPARE_BASIC_PRICE"), pro: t("PRICING.COMPARE_PRO_PRICE"), enterprise: t("PRICING.COMPARE_ENTERPRISE_PRICE") },
          { feature: t("PRICING.COMPARE_VALUE"), basic: t("PRICING.COMPARE_BASIC_VALUE"), pro: t("PRICING.COMPARE_PRO_VALUE"), enterprise: t("PRICING.COMPARE_ENTERPRISE_VALUE") },
          { feature: t("PRICING.COMPARE_RATE_LIMIT"), basic: t("PRICING.COMPARE_BASIC_RATE"), pro: t("PRICING.COMPARE_PRO_RATE"), enterprise: t("PRICING.COMPARE_ENTERPRISE_RATE") },
          { feature: t("PRICING.COMPARE_ALL_MODELS"), basic: true, pro: true, enterprise: true },
          { feature: t("PRICING.COMPARE_PRIORITY"), basic: false, pro: true, enterprise: true },
          { feature: t("PRICING.COMPARE_DEDICATED"), basic: false, pro: false, enterprise: true },
        ]}
      />
    </div>
  );
}
