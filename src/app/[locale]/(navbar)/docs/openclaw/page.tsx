import { APP_VALUES } from "@/lib/config/constants";
import { getPageMetadata } from "@/lib/config/metadata";
import { serverLocale } from "@/lib/utils/server";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/elements/code-block";
import { Link } from "@/i18n/navigation";

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  return getPageMetadata({
    locale,
    title: t("DOCS.OPENCLAW.META.TITLE", APP_VALUES),
    description: t("DOCS.OPENCLAW.META.DESCRIPTION", APP_VALUES),
    keywords: t("DOCS.OPENCLAW.META.KEYWORDS", APP_VALUES),
  });
}

export default async function OpenClawPage() {
  const t = await getTranslations();

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-2 flex items-center gap-2">
        <Badge variant="outline" className="font-mono text-xs">
          {t("DOCS.OPENCLAW.BADGE")}
        </Badge>
      </div>

      <h1 className="mt-4 text-4xl font-bold">{t("DOCS.OPENCLAW.TITLE")}</h1>
      <p className="text-muted-foreground mt-4 text-lg">
        {t("DOCS.OPENCLAW.SUBTITLE", APP_VALUES)}
      </p>

      {/* Quick Start */}
      <section className="mt-12">
        <h2 className="mb-4 text-2xl font-semibold">
          {t("DOCS.OPENCLAW.QUICK_START")}
        </h2>
        <p className="text-muted-foreground mb-6 text-sm">
          {t("DOCS.OPENCLAW.QUICK_START_DESC", APP_VALUES)}
        </p>
        <CodeBlock
          language="bash"
          code={`# Set environment variables for OpenClaw
export OPENAI_API_KEY="YOUR_API_KEY"

# Configure ${process.env.NEXT_PUBLIC_APP_NAME} as provider in ~/.openclaw/config.yaml
# Then run OpenClaw
openclaw onboard`}
        />
      </section>

      {/* Code Examples */}
      <section className="mt-12">
        <h2 className="mb-4 text-2xl font-semibold">
          {t("DOCS.OPENCLAW.CODE_EXAMPLES")}
        </h2>

        <h3 className="mb-3 text-lg font-medium">
          {t("DOCS.OPENCLAW.EXAMPLE_CONFIG")}
        </h3>
        <CodeBlock
          language="yaml"
          code={`# ~/.openclaw/config.yaml
env:
  OPENAI_API_KEY: "YOUR_API_KEY"

agents:
  defaults:
    model:
      primary: "openai/gpt-5.2"

providers:
  openai:
    baseUrl: "${process.env.NEXT_PUBLIC_API_URL}/v1"
    apiKey: env:OPENAI_API_KEY`}
        />

        <h3 className="mt-8 mb-3 text-lg font-medium">
          {t("DOCS.OPENCLAW.EXAMPLE_CURL")}
        </h3>
        <CodeBlock
          language="bash"
          code={`# Once OpenClaw gateway is running, you can also
# call it directly via the OpenAI-compatible endpoint
curl -X POST http://localhost:18789/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_GATEWAY_TOKEN" \\
  -d '{
    "model": "openclaw:main",
    "messages": [
      {"role": "user", "content": "Explain dependency injection"}
    ],
    "stream": true
  }'`}
        />
      </section>

      {/* CTA */}
      <section className="border-border mt-16 border-t pt-12 text-center">
        <h2 className="text-2xl font-semibold">
          {t("DOCS.OPENCLAW.CTA_TITLE")}
        </h2>
        <p className="text-muted-foreground mt-2">
          {t("DOCS.OPENCLAW.CTA_DESC", APP_VALUES)}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button
            nativeButton={false}
            render={<a href={`${process.env.NEXT_PUBLIC_API_URL}/register`} />}
          >
            {t("DOCS.OPENCLAW.CTA_SIGNUP")}
          </Button>
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/models" />}
          >
            {t("DOCS.OPENCLAW.CTA_MODELS")}
          </Button>
        </div>
      </section>
    </div>
  );
}
