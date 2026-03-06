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
    title: t("DOCS.CODEX.META.TITLE"),
    description: t("DOCS.CODEX.META.DESCRIPTION"),
    keywords: t("DOCS.CODEX.META.KEYWORDS"),
  });
}

export default async function CodexPage() {
  const t = await getTranslations();

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-2 flex items-center gap-2">
        <Badge variant="outline" className="font-mono text-xs">
          {t("DOCS.CODEX.BADGE")}
        </Badge>
      </div>

      <h1 className="mt-4 text-4xl font-bold">{t("DOCS.CODEX.TITLE")}</h1>
      <p className="text-muted-foreground mt-4 text-lg">
        {t("DOCS.CODEX.SUBTITLE")}
      </p>

      {/* Quick Start */}
      <section className="mt-12">
        <h2 className="mb-4 text-2xl font-semibold">
          {t("DOCS.CODEX.QUICK_START")}
        </h2>
        <p className="text-muted-foreground mb-6 text-sm">
          {t("DOCS.CODEX.QUICK_START_DESC")}
        </p>
        <CodeBlock
          language="bash"
          code={`# Environment variables for OpenAI Codex CLI
export OPENAI_BASE_URL="https://api.unorouter.ai/v1"
export OPENAI_API_KEY="YOUR_UNOROUTER_API_KEY"

# Then run Codex
codex`}
        />
      </section>

      {/* Code Examples */}
      <section className="mt-12">
        <h2 className="mb-4 text-2xl font-semibold">
          {t("DOCS.CODEX.CODE_EXAMPLES")}
        </h2>

        <h3 className="mb-3 text-lg font-medium">
          {t("DOCS.CODEX.EXAMPLE_PYTHON")}
        </h3>
        <CodeBlock
          language="python"
          code={`from openai import OpenAI

client = OpenAI(
    api_key="YOUR_UNOROUTER_API_KEY",
    base_url="https://api.unorouter.ai/v1"
)

response = client.chat.completions.create(
    model="gpt-5.2",
    messages=[
        {"role": "user", "content": "Write a binary search in Python"}
    ]
)

print(response.choices[0].message.content)`}
        />

        <h3 className="mt-8 mb-3 text-lg font-medium">
          {t("DOCS.CODEX.EXAMPLE_TYPESCRIPT")}
        </h3>
        <CodeBlock
          language="typescript"
          code={`import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "YOUR_UNOROUTER_API_KEY",
  baseURL: "https://api.unorouter.ai/v1",
});

const response = await client.chat.completions.create({
  model: "gpt-5.2",
  messages: [
    { role: "user", content: "Explain async/await" },
  ],
});

console.log(response.choices[0].message.content);`}
        />
      </section>

      {/* CTA */}
      <section className="border-border mt-16 border-t pt-12 text-center">
        <h2 className="text-2xl font-semibold">{t("DOCS.CODEX.CTA_TITLE")}</h2>
        <p className="text-muted-foreground mt-2">{t("DOCS.CODEX.CTA_DESC")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button
            nativeButton={false}
            render={<a href="https://api.unorouter.ai/register" />}
          >
            {t("DOCS.CODEX.CTA_SIGNUP")}
          </Button>
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/models" />}
          >
            {t("DOCS.CODEX.CTA_MODELS")}
          </Button>
        </div>
      </section>
    </div>
  );
}
