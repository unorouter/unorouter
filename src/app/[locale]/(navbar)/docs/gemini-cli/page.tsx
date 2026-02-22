import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/code-block";
import { Link } from "@/i18n/navigation";

export default async function GeminiCliPage() {
  const t = await getTranslations("DOCS.GEMINI_CLI");

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-2 flex items-center gap-2">
        <Badge variant="outline" className="font-mono text-xs">
          {t("BADGE")}
        </Badge>
        <Badge variant="secondary" className="font-mono text-xs">
          Gemini API
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
          code={`# Environment variables for Gemini CLI
export GEMINI_API_BASE="https://api.unorouter.ai"
export GEMINI_API_KEY="YOUR_UNOROUTER_API_KEY"

# Then run Gemini CLI
gemini`}
        />
      </section>

      {/* Code Examples */}
      <section className="mt-12">
        <h2 className="mb-4 text-2xl font-semibold">{t("CODE_EXAMPLES")}</h2>

        <h3 className="mb-3 text-lg font-medium">Python (Google GenAI SDK)</h3>
        <CodeBlock
          language="python"
          code={`from google import genai

client = genai.Client(
    api_key="YOUR_UNOROUTER_API_KEY",
    http_options={"api_version": "v1beta", "url": "https://api.unorouter.ai"}
)

response = client.models.generate_content(
    model="gemini-3-pro-preview",
    contents="Write a merge sort in Python"
)

print(response.text)`}
        />

        <h3 className="mt-8 mb-3 text-lg font-medium">
          cURL (Gemini API format)
        </h3>
        <CodeBlock
          language="bash"
          code={`curl -X POST "https://api.unorouter.ai/v1beta/models/gemini-3-pro-preview:generateContent" \\
  -H "Content-Type: application/json" \\
  -H "x-goog-api-key: YOUR_UNOROUTER_API_KEY" \\
  -d '{
    "contents": [
      {"parts": [{"text": "Explain recursion"}]}
    ]
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
