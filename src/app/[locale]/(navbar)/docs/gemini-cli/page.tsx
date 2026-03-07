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
    title: t("DOCS.GEMINI_CLI.META.TITLE"),
    description: t("DOCS.GEMINI_CLI.META.DESCRIPTION"),
    keywords: t("DOCS.GEMINI_CLI.META.KEYWORDS"),
  });
}

export default async function GeminiCliPage() {
  const t = await getTranslations();

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-2 flex items-center gap-2">
        <Badge variant="outline" className="font-mono text-xs">
          {t("DOCS.GEMINI_CLI.BADGE")}
        </Badge>
      </div>

      <h1 className="mt-4 text-4xl font-bold">{t("DOCS.GEMINI_CLI.TITLE")}</h1>
      <p className="text-muted-foreground mt-4 text-lg">
        {t("DOCS.GEMINI_CLI.SUBTITLE")}
      </p>

      {/* Quick Start */}
      <section className="mt-12">
        <h2 className="mb-4 text-2xl font-semibold">
          {t("DOCS.GEMINI_CLI.QUICK_START")}
        </h2>
        <p className="text-muted-foreground mb-6 text-sm">
          {t("DOCS.GEMINI_CLI.QUICK_START_DESC")}
        </p>
        <CodeBlock
          language="bash"
          code={`# Environment variables for Gemini CLI
export GEMINI_API_BASE="${process.env.NEXT_PUBLIC_API_URL}"
export GEMINI_API_KEY="YOUR_API_KEY"

# Then run Gemini CLI
gemini`}
        />
      </section>

      {/* Code Examples */}
      <section className="mt-12">
        <h2 className="mb-4 text-2xl font-semibold">
          {t("DOCS.GEMINI_CLI.CODE_EXAMPLES")}
        </h2>

        <h3 className="mb-3 text-lg font-medium">
          {t("DOCS.GEMINI_CLI.EXAMPLE_PYTHON")}
        </h3>
        <CodeBlock
          language="python"
          code={`from google import genai

client = genai.Client(
    api_key="YOUR_API_KEY",
    http_options={"api_version": "v1beta", "url": "${process.env.NEXT_PUBLIC_API_URL}"}
)

response = client.models.generate_content(
    model="gemini-3-pro-preview",
    contents="Write a merge sort in Python"
)

print(response.text)`}
        />

        <h3 className="mt-8 mb-3 text-lg font-medium">
          {t("DOCS.GEMINI_CLI.EXAMPLE_CURL")}
        </h3>
        <CodeBlock
          language="bash"
          code={`curl -X POST "${process.env.NEXT_PUBLIC_API_URL}/v1beta/models/gemini-3-pro-preview:generateContent" \\
  -H "Content-Type: application/json" \\
  -H "x-goog-api-key: YOUR_API_KEY" \\
  -d '{
    "contents": [
      {"parts": [{"text": "Explain recursion"}]}
    ]
  }'`}
        />
      </section>

      {/* CTA */}
      <section className="border-border mt-16 border-t pt-12 text-center">
        <h2 className="text-2xl font-semibold">
          {t("DOCS.GEMINI_CLI.CTA_TITLE")}
        </h2>
        <p className="text-muted-foreground mt-2">
          {t("DOCS.GEMINI_CLI.CTA_DESC")}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button
            nativeButton={false}
            render={<a href={`${process.env.NEXT_PUBLIC_API_URL}/register`} />}
          >
            {t("DOCS.GEMINI_CLI.CTA_SIGNUP")}
          </Button>
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/models" />}
          >
            {t("DOCS.GEMINI_CLI.CTA_MODELS")}
          </Button>
        </div>
      </section>
    </div>
  );
}
