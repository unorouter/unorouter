import { getTranslations } from "next-intl/server";
import { ArrowRight, Zap, Shield, Globe, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ModelTicker } from "@/components/model-ticker";
import { PricingCard } from "@/components/pricing-card";
import { CodeBlock } from "@/components/code-block";
import { fetchPricing, processModels } from "@/lib/api/pricing";
import { Link } from "@/i18n/navigation";

export default async function HomePage() {
  const t = await getTranslations();

  let models: { name: string; vendor: string }[] = [];
  let modelCount = 0;
  let vendorCount = 0;

  try {
    const pricing = await fetchPricing();
    const processed = processModels(pricing);
    models = processed.map((m) => ({ name: m.name, vendor: m.vendor.name }));
    modelCount = processed.length;
    vendorCount = new Set(pricing.vendors.map((v) => v.name)).size;
  } catch {
    modelCount = 17;
    vendorCount = 21;
  }

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
          <div className="flex flex-col items-center text-center">
            <Badge variant="outline" className="mb-6 font-mono">
              {t("HOME.HERO_BADGE")}
            </Badge>

            <h1 className="max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
              {t("HOME.HERO_TITLE")}
            </h1>

            <p className="text-muted-foreground mt-6 max-w-xl text-lg">
              {t("HOME.HERO_SUBTITLE")}
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Button size="lg" render={<a href="https://api.unorouter.ai/register" />}>
                {t("HOME.HERO_CTA_PRIMARY")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" render={<Link href="/models" />}>
                {t("HOME.HERO_CTA_SECONDARY")}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-border border-y">
        <div className="mx-auto grid max-w-6xl grid-cols-2 divide-x divide-y md:grid-cols-4 md:divide-y-0">
          <StatItem label={t("HOME.STATS_MODELS")} value={String(modelCount)} />
          <StatItem
            label={t("HOME.STATS_PROVIDERS")}
            value={`${vendorCount}+`}
          />
          <StatItem label={t("HOME.STATS_UPTIME")} value="99.9%" />
          <StatItem label={t("HOME.STATS_ENDPOINTS")} value="5" />
        </div>
      </section>

      {/* Model Ticker */}
      {models.length > 0 && (
        <section className="py-12">
          <div className="mx-auto max-w-6xl px-6">
            <p className="text-muted-foreground mb-6 font-mono text-xs uppercase tracking-wider">
              {t("HOME.TICKER_LABEL")}
            </p>
          </div>
          <ModelTicker models={models} />
        </section>
      )}

      {/* Claude Code Integration Banner */}
      <section className="py-12">
        <div className="mx-auto max-w-6xl px-6">
          <Link
            href="/docs/claude-code"
            className="border-border bg-card hover:border-primary/50 group flex flex-col gap-6 border p-6 transition-colors md:flex-row md:items-center md:p-8"
          >
            <div className="bg-primary/10 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg">
              <Terminal className="text-primary h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="mb-2 flex items-center gap-2">
                <Badge variant="secondary" className="font-mono text-xs">
                  {t("HOME.INTEGRATION_BADGE")}
                </Badge>
              </div>
              <h3 className="text-lg font-semibold">
                {t("HOME.INTEGRATION_TITLE")}
              </h3>
              <p className="text-muted-foreground mt-1 text-sm">
                {t("HOME.INTEGRATION_DESCRIPTION")}
              </p>
            </div>
            <ArrowRight className="text-muted-foreground group-hover:text-foreground h-5 w-5 transition-colors" />
          </Link>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
            <p className="text-muted-foreground mb-3 font-mono text-xs uppercase tracking-wider">
              {t("HOME.PRICING_LABEL")}
            </p>
            <h2 className="text-3xl font-bold">{t("HOME.PRICING_TITLE")}</h2>
            <p className="text-muted-foreground mt-3 text-lg">
              {t("HOME.PRICING_SUBTITLE")}
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <PricingCard
              name={t("HOME.PRICING_BASIC_NAME")}
              price={20}
              value={30}
              multiplier="1.5x"
              rateLimit={100}
              features={[
                t("HOME.PRICING_FEATURE_MODELS"),
                t("HOME.PRICING_FEATURE_SUPPORT"),
              ]}
              cta={t("HOME.PRICING_CTA")}
            />
            <PricingCard
              name={t("HOME.PRICING_PRO_NAME")}
              price={50}
              value={75}
              multiplier="1.5x"
              rateLimit={500}
              popular
              features={[
                t("HOME.PRICING_FEATURE_MODELS"),
                t("HOME.PRICING_FEATURE_PRIORITY"),
                t("HOME.PRICING_FEATURE_SUPPORT"),
              ]}
              cta={t("HOME.PRICING_CTA")}
            />
            <PricingCard
              name={t("HOME.PRICING_ENTERPRISE_NAME")}
              price={100}
              value={175}
              multiplier="1.75x"
              rateLimit={2000}
              features={[
                t("HOME.PRICING_FEATURE_MODELS"),
                t("HOME.PRICING_FEATURE_PRIORITY"),
                t("HOME.PRICING_FEATURE_DEDICATED"),
                t("HOME.PRICING_FEATURE_SUPPORT"),
              ]}
              cta={t("HOME.PRICING_CTA")}
            />
          </div>
        </div>
      </section>

      {/* Code Example */}
      <section className="border-border border-y py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid items-start gap-12 md:grid-cols-2">
            <div>
              <p className="text-muted-foreground mb-3 font-mono text-xs uppercase tracking-wider">
                {t("HOME.CODE_LABEL")}
              </p>
              <h2 className="text-3xl font-bold">{t("HOME.CODE_TITLE")}</h2>
              <p className="text-muted-foreground mt-4">
                {t("HOME.CODE_DESCRIPTION")}
              </p>

              <div className="mt-8 space-y-4">
                <Feature
                  icon={<Zap className="h-4 w-4" />}
                  title={t("HOME.CODE_FEATURE_1_TITLE")}
                  description={t("HOME.CODE_FEATURE_1_DESC")}
                />
                <Feature
                  icon={<Shield className="h-4 w-4" />}
                  title={t("HOME.CODE_FEATURE_2_TITLE")}
                  description={t("HOME.CODE_FEATURE_2_DESC")}
                />
                <Feature
                  icon={<Globe className="h-4 w-4" />}
                  title={t("HOME.CODE_FEATURE_3_TITLE")}
                  description={t("HOME.CODE_FEATURE_3_DESC")}
                />
              </div>
            </div>

            <CodeBlock
              language="bash"
              code={`curl -X POST https://api.unorouter.ai/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "model": "claude-sonnet-4-6",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ],
    "stream": true
  }'`}
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="text-3xl font-bold">{t("HOME.CTA_TITLE")}</h2>
          <p className="text-muted-foreground mt-4 text-lg">
            {t("HOME.CTA_SUBTITLE")}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button size="lg" render={<a href="https://api.unorouter.ai/register" />}>
              {t("HOME.CTA_PRIMARY")}
            </Button>
            <Button size="lg" variant="outline" render={<Link href="/docs/claude-code" />}>
              {t("HOME.CTA_SECONDARY")}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatItem(props: { label: string; value: string }) {
  return (
    <div className="px-6 py-6 text-center">
      <p className="text-2xl font-bold md:text-3xl">{props.value}</p>
      <p className="text-muted-foreground mt-1 font-mono text-xs uppercase tracking-wider">
        {props.label}
      </p>
    </div>
  );
}

function Feature(props: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="text-primary mt-0.5 shrink-0">{props.icon}</div>
      <div>
        <p className="text-sm font-medium">{props.title}</p>
        <p className="text-muted-foreground text-sm">{props.description}</p>
      </div>
    </div>
  );
}
