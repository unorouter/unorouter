import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/elements/code-block";
import { Link } from "@/i18n/navigation";

export default async function OpenClawPage() {
  const t = await getTranslations("DOCS.OPENCLAW");

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-2 flex items-center gap-2">
        <Badge variant="outline" className="font-mono text-xs">
          {t("BADGE")}
        </Badge>
        <Badge variant="secondary" className="font-mono text-xs">
          {t("API_BADGE")}
        </Badge>
      </div>

      <h1 className="mt-4 text-4xl font-bold">{t("TITLE")}</h1>
      <p className="text-muted-foreground mt-4 text-lg">{t("SUBTITLE")}</p>

      {/* Quick Start */}
      <section className="mt-12">
        <h2 className="mb-4 text-2xl font-semibold">{t("QUICK_START")}</h2>
        <p className="text-muted-foreground mb-6 text-sm">
          {t("QUICK_START_DESC")}
        </p>
        <CodeBlock
          language="bash"
          code={`# Set environment variables for OpenClaw
export OPENAI_API_KEY="YOUR_UNOROUTER_API_KEY"

# Configure UnoRouter as provider in ~/.openclaw/config.yaml
# Then run OpenClaw
openclaw onboard`}
        />
      </section>

      {/* Code Examples */}
      <section className="mt-12">
        <h2 className="mb-4 text-2xl font-semibold">{t("CODE_EXAMPLES")}</h2>

        <h3 className="mb-3 text-lg font-medium">{t("EXAMPLE_CONFIG")}</h3>
        <CodeBlock
          language="yaml"
          code={`# ~/.openclaw/config.yaml
env:
  OPENAI_API_KEY: "YOUR_UNOROUTER_API_KEY"

agents:
  defaults:
    model:
      primary: "openai/gpt-5.2"

providers:
  openai:
    baseUrl: "https://api.unorouter.ai/v1"
    apiKey: env:OPENAI_API_KEY`}
        />

        <h3 className="mt-8 mb-3 text-lg font-medium">{t("EXAMPLE_CURL")}</h3>
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
        <h2 className="text-2xl font-semibold">{t("CTA_TITLE")}</h2>
        <p className="text-muted-foreground mt-2">{t("CTA_DESC")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button nativeButton={false} render={<a href="https://api.unorouter.ai/register" />}>
            {t("CTA_SIGNUP")}
          </Button>
          <Button nativeButton={false} variant="outline" render={<Link href="/models" />}>
            {t("CTA_MODELS")}
          </Button>
        </div>
      </section>
    </div>
  );
}
