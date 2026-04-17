import { CodeBlock } from "@/components/elements/code/code-block";
import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import {
  findContextTag,
  findSimilarModels,
  formatTokenPrice,
  type ProcessedModel,
} from "@/lib/api/pricing";
import { APP_VALUES } from "@/lib/config/constants";
import { env } from "@/lib/config/env";
import { getTranslations } from "next-intl/server";

interface ModelDetailProps {
  model: ProcessedModel;
  models: ProcessedModel[];
}

export async function ModelDetail(props: ModelDetailProps) {
  const m = props.model;
  const t = await getTranslations();
  const contextTag = findContextTag(m);
  const similar = findSimilarModels(props.models, m);

  const curlExample = `curl ${env.apiUrl}/v1/chat/completions \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${m.name}",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`;

  const tsExample = `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "${env.apiUrl}/v1",
  apiKey: process.env.UNOROUTER_API_KEY,
});

const res = await client.chat.completions.create({
  model: "${m.name}",
  messages: [{ role: "user", content: "Hello!" }],
});

console.log(res.choices[0].message.content);`;

  const pyExample = `from openai import OpenAI

client = OpenAI(
    base_url="${env.apiUrl}/v1",
    api_key=os.environ["UNOROUTER_API_KEY"],
)

res = client.chat.completions.create(
    model="${m.name}",
    messages=[{"role": "user", "content": "Hello!"}],
)

print(res.choices[0].message.content)`;

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      {/* Hero */}
      <div className="mb-10 flex items-start gap-5">
        <div className="border-border bg-card flex size-16 shrink-0 items-center justify-center rounded-xl border">
          <VendorIcon vendor={m.vendor.icon ?? m.vendor.name} size={40} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-muted-foreground mb-1 text-sm">
            {m.vendor.name}
          </div>
          <h1 className="mb-3 text-3xl font-bold tracking-tight">{m.name}</h1>
          <div className="flex flex-wrap gap-2">
            {(m.tags ?? []).map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {m.description && (
        <section className="mb-12">
          <h2 className="mb-3 text-xl font-semibold">
            {t("MODEL_PAGE.ABOUT", { name: m.name })}
          </h2>
          <p className="text-muted-foreground text-[15px] leading-relaxed">
            {m.description}
          </p>
        </section>
      )}

      {/* Pricing */}
      <section className="mb-12">
        <h2 className="mb-4 text-xl font-semibold">
          {t("MODEL_PAGE.PRICING_TITLE")}
        </h2>
        <p className="text-muted-foreground mb-4 text-sm">
          {t("MODEL_PAGE.PRICING_DESC", { name: m.name })}
        </p>
        <div className="border-border overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <tbody className="divide-border divide-y">
              <tr>
                <td className="bg-muted/50 px-4 py-3 font-medium">
                  {t("MODEL_PAGE.INPUT_PRICE")}
                </td>
                <td className="px-4 py-3 font-mono">
                  {t("MODEL_PAGE.PRICE_PER_MILLION", {
                    price: formatTokenPrice(m.inputPrice),
                  })}
                </td>
              </tr>
              <tr>
                <td className="bg-muted/50 px-4 py-3 font-medium">
                  {t("MODEL_PAGE.OUTPUT_PRICE")}
                </td>
                <td className="px-4 py-3 font-mono">
                  {t("MODEL_PAGE.PRICE_PER_MILLION", {
                    price: formatTokenPrice(m.outputPrice),
                  })}
                </td>
              </tr>
              {contextTag && (
                <tr>
                  <td className="bg-muted/50 px-4 py-3 font-medium">
                    {t("MODEL_PAGE.CONTEXT_WINDOW")}
                  </td>
                  <td className="px-4 py-3 font-mono">
                    {t("MODEL_PAGE.CONTEXT_TOKENS", { count: contextTag })}
                  </td>
                </tr>
              )}
              <tr>
                <td className="bg-muted/50 px-4 py-3 font-medium">
                  {t("MODEL_PAGE.ENDPOINTS")}
                </td>
                <td className="px-4 py-3">
                  {(m.endpointTypes ?? []).join(", ")}
                </td>
              </tr>
              <tr>
                <td className="bg-muted/50 px-4 py-3 font-medium">
                  {t("MODEL_PAGE.VENDOR")}
                </td>
                <td className="px-4 py-3">{m.vendor.name}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Code examples */}
      <section className="mb-12">
        <h2 className="mb-4 text-xl font-semibold">
          {t("MODEL_PAGE.CODE_TITLE", { name: m.name })}
        </h2>
        <p className="text-muted-foreground mb-4 text-sm">
          {t("MODEL_PAGE.CODE_DESC", APP_VALUES)}
        </p>
        <div className="space-y-4">
          <div>
            <h3 className="mb-2 text-sm font-medium">curl</h3>
            <CodeBlock language="bash" code={curlExample} />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-medium">TypeScript</h3>
            <CodeBlock language="typescript" code={tsExample} />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-medium">Python</h3>
            <CodeBlock language="python" code={pyExample} />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mb-12">
        <h2 className="mb-4 text-xl font-semibold">
          {t("MODEL_PAGE.FAQ_TITLE")}
        </h2>
        <div className="space-y-5">
          <div>
            <h3 className="mb-2 font-medium">
              {t("MODEL_PAGE.FAQ_COST_Q", { name: m.name })}
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {t("MODEL_PAGE.FAQ_COST_A", {
                name: m.name,
                input: formatTokenPrice(m.inputPrice),
                output: formatTokenPrice(m.outputPrice),
              })}
            </p>
          </div>
          <div>
            <h3 className="mb-2 font-medium">
              {t("MODEL_PAGE.FAQ_API_Q", { name: m.name })}
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {t("MODEL_PAGE.FAQ_API_A", { ...APP_VALUES, name: m.name })}
            </p>
          </div>
          {contextTag && (
            <div>
              <h3 className="mb-2 font-medium">
                {t("MODEL_PAGE.FAQ_CONTEXT_Q", { name: m.name })}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {t("MODEL_PAGE.FAQ_CONTEXT_A", {
                  name: m.name,
                  context: contextTag,
                })}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Similar models */}
      {(similar.sameVendor.length > 0 || similar.sameTag.length > 0) && (
        <section className="mb-12">
          <h2 className="mb-4 text-xl font-semibold">
            {t("MODEL_PAGE.SIMILAR_TITLE")}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[...similar.sameVendor, ...similar.sameTag].map(
              (sim) => (
                <Link
                  key={sim.name}
                  href={{
                    pathname: "/models/[slug]",
                    params: { slug: sim.name },
                  }}
                  className="border-border hover:border-foreground/30 bg-card flex items-center gap-3 rounded-lg border p-4 transition-colors"
                >
                  <VendorIcon vendor={sim.vendor.icon ?? sim.vendor.name} size={28} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{sim.name}</div>
                    <div className="text-muted-foreground truncate text-xs">
                      {sim.vendor.name}
                    </div>
                  </div>
                </Link>
              ),
            )}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="border-border mt-16 border-t pt-10 text-center">
        <h2 className="text-2xl font-semibold">
          {t("MODEL_PAGE.CTA_TITLE", { name: m.name })}
        </h2>
        <p className="text-muted-foreground mt-2">
          {t("MODEL_PAGE.CTA_DESC")}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button nativeButton={false} render={<Link href="/register" />}>
            {t("MODEL_PAGE.CTA_SIGNUP")}
          </Button>
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/models" />}
          >
            {t("MODEL_PAGE.CTA_ALL_MODELS")}
          </Button>
        </div>
      </section>
    </div>
  );
}
