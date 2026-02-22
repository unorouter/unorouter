import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/code-block";
import { Link } from "@/i18n/navigation";

export default async function ClaudeCodePage() {
  const t = await getTranslations("DOCS.CLAUDE_CODE");

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-2 flex items-center gap-2">
        <Badge variant="outline" className="font-mono text-xs">
          {t("BADGE")}
        </Badge>
        <Badge variant="secondary" className="font-mono text-xs">
          Anthropic API
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
          code={`# Environment variables for Claude Code
export ANTHROPIC_BASE_URL="https://api.unorouter.ai"
export ANTHROPIC_API_KEY="YOUR_UNOROUTER_API_KEY"

# Then run Claude Code
claude`}
        />
      </section>

      {/* Python Example */}
      <section className="mt-12">
        <h2 className="mb-4 text-2xl font-semibold">{t("CODE_EXAMPLES")}</h2>

        <h3 className="mb-3 text-lg font-medium">Python (Anthropic SDK)</h3>
        <CodeBlock
          language="python"
          code={`from anthropic import Anthropic

client = Anthropic(
    api_key="YOUR_UNOROUTER_API_KEY",
    base_url="https://api.unorouter.ai"
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
        <h3 className="mt-8 mb-3 text-lg font-medium">cURL (Streaming)</h3>
        <CodeBlock
          language="bash"
          code={`curl -X POST https://api.unorouter.ai/v1/messages \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_UNOROUTER_API_KEY" \\
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
        <h2 className="text-2xl font-semibold">{t("CTA_TITLE")}</h2>
        <p className="text-muted-foreground mt-2">{t("CTA_DESC")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button render={<a href="https://api.unorouter.ai/register" />}>
            {t("CTA_SIGNUP")}
          </Button>
          <Button variant="outline" render={<Link href="/models" />}>
            {t("CTA_MODELS")}
          </Button>
        </div>
      </section>
    </div>
  );
}
