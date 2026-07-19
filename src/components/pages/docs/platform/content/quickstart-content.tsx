import { ApiKeyCodeBlock } from "@/components/elements/code/api-key-code-block";
import { highlightCode } from "@/components/elements/code/code-block";
import {
  DocKbd,
  DocPageLink,
  DocSection,
  DocTable,
} from "@/components/pages/docs/doc-parts";
import { env } from "@/lib/config/env";
import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";
import { platformDocKey } from "../platform-doc-template";

const P = "DOCS_PLATFORM.QUICKSTART";
const KEY = "YOUR_API_KEY";

export async function QuickstartContent() {
  const t = await getTranslations();
  const k = (leaf: string) => t(platformDocKey(P, leaf), APP_VALUES);

  const curl = `curl ${env.apiUrl}/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${KEY}" \\
  -d '{
    "model": "gpt-oss-120b:free",
    "messages": [{ "role": "user", "content": "Hello!" }]
  }'`;

  const python = `from openai import OpenAI

client = OpenAI(
    base_url="${env.apiUrl}/v1",
    api_key="${KEY}",
)

completion = client.chat.completions.create(
    model="gpt-oss-120b:free",
    messages=[{"role": "user", "content": "Hello!"}],
)
print(completion.choices[0].message.content)`;

  const node = `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "${env.apiUrl}/v1",
  apiKey: "${KEY}",
});

const completion = await client.chat.completions.create({
  model: "gpt-oss-120b:free",
  messages: [{ role: "user", content: "Hello!" }],
});
console.log(completion.choices[0].message.content);`;

  return (
    <>
      <DocSection id="overview" title={k("H_OVERVIEW")}>
        <p>{k("P_OVERVIEW_1")}</p>
        <p>{k("P_OVERVIEW_2")}</p>
      </DocSection>
      <DocSection id="base-url" title={k("H_BASE_URL")}>
        <p>{k("P_BASE_URL_1")}</p>
        <DocTable
          headers={[k("T_VARIABLE"), k("T_VALUE")]}
          rows={[
            [
              <DocKbd key="b">BASE_URL</DocKbd>,
              <DocKbd key="bv">{`${env.apiUrl}/v1`}</DocKbd>,
            ],
            [<DocKbd key="k">API_KEY</DocKbd>, k("T_API_KEY_VALUE")],
          ]}
        />
        <p>{k("P_BASE_URL_2")}</p>
      </DocSection>
      <DocSection id="api-key" title={k("H_API_KEY")}>
        <p>{k("P_API_KEY_1")}</p>
        <p>
          {k("P_API_KEY_SCOPES")}{" "}
          <DocPageLink slug="account-and-billing">
            {t("DOCS_PLATFORM.ACCOUNT_AND_BILLING.TITLE")}
          </DocPageLink>
        </p>
        <p>{k("P_API_KEY_2")}</p>
      </DocSection>
      <DocSection id="first-request" title={k("H_FIRST_REQUEST")}>
        <p>{k("P_FIRST_REQUEST_1")}</p>
        <ApiKeyCodeBlock
          html={await highlightCode(curl, "bash")}
          code={curl}
          language="bash"
          placeholder={KEY}
        />
        <p>{k("P_FIRST_REQUEST_2")}</p>
      </DocSection>
      <DocSection id="sdks" title={k("H_SDKS")}>
        <p>{k("P_SDKS_1")}</p>
        <ApiKeyCodeBlock
          html={await highlightCode(python, "python")}
          code={python}
          language="python"
          placeholder={KEY}
          label="Python"
        />
        <ApiKeyCodeBlock
          html={await highlightCode(node, "typescript")}
          code={node}
          language="typescript"
          placeholder={KEY}
          label="Node.js"
        />
      </DocSection>
      <DocSection id="next" title={k("H_NEXT")}>
        <p>{k("P_NEXT_1")}</p>
        <p>
          {k("P_NEXT_2")}{" "}
          <DocPageLink slug="models-and-pricing">
            {t("DOCS_PLATFORM.MODELS_AND_PRICING.TITLE")}
          </DocPageLink>
        </p>
        <p>
          {k("P_NEXT_ERRORS")}{" "}
          <DocPageLink slug="errors-and-rate-limits">
            {t("DOCS_PLATFORM.ERRORS_AND_RATE_LIMITS.TITLE")}
          </DocPageLink>
        </p>
      </DocSection>
    </>
  );
}
