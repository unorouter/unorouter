import { getTranslations } from "next-intl/server";
import { Check, X } from "lucide-react";
import { PricingCard } from "@/components/pricing-card";

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
      <div className="mt-20">
        <h2 className="mb-8 text-center text-2xl font-bold">
          {t("COMPARE_TITLE")}
        </h2>
        <div className="border-border overflow-x-auto border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border border-b">
                <th className="text-muted-foreground px-6 py-4 text-left font-medium">
                  {t("COMPARE_FEATURE")}
                </th>
                <th className="px-6 py-4 text-center font-medium">
                  {t("BASIC_NAME")}
                </th>
                <th className="bg-primary/5 px-6 py-4 text-center font-medium">
                  {t("PRO_NAME")}
                </th>
                <th className="px-6 py-4 text-center font-medium">
                  {t("ENTERPRISE_NAME")}
                </th>
              </tr>
            </thead>
            <tbody>
              <CompareRow
                feature={t("COMPARE_PRICE")}
                basic="$20/mo"
                pro="$50/mo"
                enterprise="$100/mo"
              />
              <CompareRow
                feature={t("COMPARE_VALUE")}
                basic="$30"
                pro="$75"
                enterprise="$175"
              />
              <CompareRow
                feature={t("COMPARE_RATE_LIMIT")}
                basic="100 rpm"
                pro="500 rpm"
                enterprise="2,000 rpm"
              />
              <CompareRow
                feature={t("COMPARE_ALL_MODELS")}
                basic={true}
                pro={true}
                enterprise={true}
              />
              <CompareRow
                feature={t("COMPARE_PRIORITY")}
                basic={false}
                pro={true}
                enterprise={true}
              />
              <CompareRow
                feature={t("COMPARE_DEDICATED")}
                basic={false}
                pro={false}
                enterprise={true}
              />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CompareRow(props: {
  feature: string;
  basic: string | boolean;
  pro: string | boolean;
  enterprise: string | boolean;
}) {
  return (
    <tr className="border-border border-b last:border-b-0">
      <td className="text-muted-foreground px-6 py-3">{props.feature}</td>
      <CompareCell value={props.basic} />
      <CompareCell value={props.pro} highlighted />
      <CompareCell value={props.enterprise} />
    </tr>
  );
}

function CompareCell(props: { value: string | boolean; highlighted?: boolean }) {
  return (
    <td
      className={`px-6 py-3 text-center ${props.highlighted ? "bg-primary/5" : ""}`}
    >
      {typeof props.value === "boolean" ? (
        props.value ? (
          <Check className="text-primary mx-auto h-4 w-4" />
        ) : (
          <X className="text-muted-foreground mx-auto h-4 w-4" />
        )
      ) : (
        <span className="font-mono text-sm">{props.value}</span>
      )}
    </td>
  );
}
