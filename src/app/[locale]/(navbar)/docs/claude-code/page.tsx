import { APP_VALUES } from "@/lib/config/constants";
import { getPageMetadata } from "@/lib/config/metadata";
import { serverLocale } from "@/lib/utils/server";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GetStartedButton } from "@/components/elements/get-started-link";
import { CodeBlock } from "@/components/elements/code-block";
import { Link } from "@/i18n/navigation";

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  return getPageMetadata({
    locale,
    title: t("DOCS.CLAUDE_CODE.META.TITLE", APP_VALUES),
    description: t("DOCS.CLAUDE_CODE.META.DESCRIPTION", APP_VALUES),
    keywords: t("DOCS.CLAUDE_CODE.META.KEYWORDS", APP_VALUES),
  });
}

export default async function ClaudeCodePage() {
  const t = await getTranslations();

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-2 flex items-center gap-2">
        <Badge variant="outline" className="font-mono text-xs">
          {t("DOCS.CLAUDE_CODE.BADGE")}
        </Badge>
      </div>

      <h1 className="mt-4 text-4xl font-bold">{t("DOCS.CLAUDE_CODE.TITLE")}</h1>
      <p className="text-muted-foreground mt-4 text-lg">
        {t("DOCS.CLAUDE_CODE.SUBTITLE", APP_VALUES)}
      </p>

      {/* Quick Start */}
      <section className="mt-12">
        <h2 className="mb-4 text-2xl font-semibold">
          {t("DOCS.CLAUDE_CODE.QUICK_START")}
        </h2>
        <p className="text-muted-foreground mb-6 text-sm">
          {t("DOCS.CLAUDE_CODE.QUICK_START_DESC", APP_VALUES)}
        </p>
        <CodeBlock
          language="bash"
          code={`# Environment variables for Claude Code
export ANTHROPIC_BASE_URL="${process.env.NEXT_PUBLIC_API_URL}"
export ANTHROPIC_API_KEY="YOUR_API_KEY"

# Then run Claude Code
claude`}
        />
      </section>

      {/* Python Example */}
      <section className="mt-12">
        <h2 className="mb-4 text-2xl font-semibold">
          {t("DOCS.CLAUDE_CODE.CODE_EXAMPLES")}
        </h2>

        <h3 className="mb-3 text-lg font-medium">
          {t("DOCS.CLAUDE_CODE.EXAMPLE_PYTHON")}
        </h3>
        <CodeBlock
          language="python"
          code={`from anthropic import Anthropic

client = Anthropic(
    api_key="YOUR_API_KEY",
    base_url="${process.env.NEXT_PUBLIC_API_URL}"
)

message = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=1024,
    messages=[
        {"role": "user", "content": "Write a quick sort in Python"}
    ]
)

print(message.content[0].text)`}
        />

        {/* cURL Example */}
        <h3 className="mt-8 mb-3 text-lg font-medium">
          {t("DOCS.CLAUDE_CODE.EXAMPLE_CURL")}
        </h3>
        <CodeBlock
          language="bash"
          code={`curl -X POST ${process.env.NEXT_PUBLIC_API_URL}/v1/messages \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "anthropic-version: 2023-06-01" \\
  -d '{
    "model": "claude-sonnet-4-6",
    "max_tokens": 1024,
    "messages": [
      {"role": "user", "content": "Explain quantum computing"}
    ],
    "stream": true
  }'`}
        />
      </section>

      {/* CTA */}
      <section className="border-border mt-16 border-t pt-12 text-center">
        <h2 className="text-2xl font-semibold">
          {t("DOCS.CLAUDE_CODE.CTA_TITLE")}
        </h2>
        <p className="text-muted-foreground mt-2">
          {t("DOCS.CLAUDE_CODE.CTA_DESC", APP_VALUES)}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <GetStartedButton translationKey="DOCS.CLAUDE_CODE.CTA_SIGNUP" />
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/models" />}
          >
            {t("DOCS.CLAUDE_CODE.CTA_MODELS")}
          </Button>
        </div>
      </section>
    </div>
  );
}
