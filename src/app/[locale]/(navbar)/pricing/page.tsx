import { getTranslations } from "next-intl/server";
import { PricingCard } from "@/components/elements/pricing-card";
import { CompareTable } from "@/components/pages/pricing/compare-table";

export default async function PricingPage() {
  const t = await getTranslations("PRICING");

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold">{t("TITLE")}</h1>
        <p className="text-muted-foreground mt-3 text-lg">{t("SUBTITLE")}</p>
      </div>

      {/* Pricing Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <PricingCard
          name={t("BASIC_NAME")}
          price={20}
          value={30}
          multiplier="1.5x"
          rateLimit={100}
          features={[
            t("FEATURE_MODELS"),
            t("FEATURE_SUPPORT"),
          ]}
          cta={t("CTA")}
        />
        <PricingCard
          name={t("PRO_NAME")}
          price={50}
          value={75}
          multiplier="1.5x"
          rateLimit={500}
          popular
          features={[
            t("FEATURE_MODELS"),
            t("FEATURE_PRIORITY"),
            t("FEATURE_SUPPORT"),
          ]}
          cta={t("CTA")}
        />
        <PricingCard
          name={t("ENTERPRISE_NAME")}
          price={100}
          value={175}
          multiplier="1.75x"
          rateLimit={2000}
          features={[
            t("FEATURE_MODELS"),
            t("FEATURE_PRIORITY"),
            t("FEATURE_DEDICATED"),
            t("FEATURE_SUPPORT"),
          ]}
          cta={t("CTA")}
        />
      </div>

      {/* Feature Comparison */}
      <CompareTable
        title={t("COMPARE_TITLE")}
        featureLabel={t("COMPARE_FEATURE")}
        basicName={t("BASIC_NAME")}
        proName={t("PRO_NAME")}
        enterpriseName={t("ENTERPRISE_NAME")}
        rows={[
          { feature: t("COMPARE_PRICE"), basic: t("COMPARE_BASIC_PRICE"), pro: t("COMPARE_PRO_PRICE"), enterprise: t("COMPARE_ENTERPRISE_PRICE") },
          { feature: t("COMPARE_VALUE"), basic: t("COMPARE_BASIC_VALUE"), pro: t("COMPARE_PRO_VALUE"), enterprise: t("COMPARE_ENTERPRISE_VALUE") },
          { feature: t("COMPARE_RATE_LIMIT"), basic: t("COMPARE_BASIC_RATE"), pro: t("COMPARE_PRO_RATE"), enterprise: t("COMPARE_ENTERPRISE_RATE") },
          { feature: t("COMPARE_ALL_MODELS"), basic: true, pro: true, enterprise: true },
          { feature: t("COMPARE_PRIORITY"), basic: false, pro: true, enterprise: true },
          { feature: t("COMPARE_DEDICATED"), basic: false, pro: false, enterprise: true },
        ]}
      />
    </div>
  );
}
