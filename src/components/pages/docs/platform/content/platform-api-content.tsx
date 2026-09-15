import {
  DocAppLink,
  DocCode,
  DocPageLink,
  DocSection,
  DocTable,
  DocWarning,
} from "@/components/pages/docs/doc-parts";
import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";
import { platformDocKey } from "../platform-doc-template";

const P = "DOCS_PLATFORM.PLATFORM_API";

const API = `https://api.${APP_VALUES.appDomain}`;

const CATALOG_CURL = `curl ${API}/api/pricing/catalog`;

const CATALOG_JSON = `{
  "counts": { "models": 239, "free": 134, "paid": 105, "vendors": 50 },
  "first_free_model": "glm-5.3:free",
  "vendors": [{ "vendor_id": 4, "vendor_name": "Zhipu", "icon": "Zhipu.Color" }],
  "models": [
    {
      "model_name": "glm-5.3",
      "vendor": "Zhipu",
      "type": "text",
      "is_free": false,
      "online": true,
      "input_price": 0.05103,
      "output_price": 0.160382187,
      "original_input_price": 1.26,
      "original_output_price": 3.960054,
      "tags": "Text,Reasoning,Tools,Cache",
      "supported_endpoint_types": ["openai", "anthropic"],
      "uptime_24h": 99.965,
      "success_rate": 95,
      "avg_latency_ms": 11062
    }
  ]
}`;

const MODEL_PRICE_CURL = `curl "${API}/api/pricing/catalog/model?model=glm-5.3"`;

const MODEL_PRICE_JSON = `{
  "model_name": "glm-5.3",
  "model_ratio": 0.63,
  "completion_ratio": 3.1429,
  "cache_ratio": 0.1857,
  "input_price": 0.05103,
  "output_price": 0.160382187,
  "grid_min_ratio": 0.0405,
  "auto_chain": ["a7-bbgt-2846-glm-5.3", "a7-kkl-3731-glm-5.3", "a7-4069-glm-5.3"],
  "group_ratio": {
    "a7-bbgt-2846-glm-5.3": 0.0405,
    "a7-kkl-3731-glm-5.3": 0.0911,
    "a7-4069-glm-5.3": 0.1214
  },
  "enable_groups": ["a7-bbgt-2846-glm-5.3", "a7-kkl-3731-glm-5.3"]
}`;

const PRICE_FORMULA = `input  $/1M = model_ratio * 2 * group_ratio
output $/1M = input * completion_ratio
cached $/1M = input * cache_ratio

glm-5.3 on a7-bbgt-2846: 0.63 * 2 * 0.0405 = $0.05103 / 1M in
                          0.05103 * 3.1429  = $0.16038 / 1M out`;

const MODELS_CURL = `curl ${API}/v1/models \\
  -H "Authorization: Bearer $UNOROUTER_API_KEY"`;

const SELF_CURL = `curl ${API}/api/user/self \\
  -H "Authorization: Bearer $UNOROUTER_ACCESS_TOKEN"`;

const SELF_JSON = `{
  "success": true,
  "message": "",
  "data": {
    "id": 12345,
    "username": "you",
    "group": "default",
    "quota": 265000,
    "used_quota": 4231900,
    "request_count": 1884,
    "aff_code": "ABC123"
  }
}`;

const KEYS_CURL = `curl "${API}/api/token/?p=1&page_size=20" \\
  -H "Authorization: Bearer $UNOROUTER_ACCESS_TOKEN"

curl -X POST ${API}/api/token/42/key \\
  -H "Authorization: Bearer $UNOROUTER_ACCESS_TOKEN"`;

const LOGS_CURL = `curl -G ${API}/api/log/self \\
  -H "Authorization: Bearer $UNOROUTER_ACCESS_TOKEN" \\
  -d p=1 \\
  -d page_size=100 \\
  -d type=2 \\
  -d start_timestamp=1789344000 \\
  -d model_name=glm-5.3`;

const USAGE_CURL = `curl ${API}/api/usage/token/ \\
  -H "Authorization: Bearer $UNOROUTER_API_KEY"`;

const USAGE_JSON = `{
  "object": "token_usage",
  "name": "SillyTavern",
  "total_granted": 500000,
  "total_used": 231900,
  "total_available": 268100,
  "unlimited_quota": false,
  "model_limits_enabled": false,
  "expires_at": 0
}`;

const ENVELOPE_JSON = `{ "success": true, "message": "", "data": { ... } }

{ "success": true, "message": "", "data": {
    "page": 1, "page_size": 20, "total": 137, "items": [ ... ]
} }`;

export async function PlatformApiContent() {
  const t = await getTranslations();
  const k = (leaf: string) => t(platformDocKey(P, leaf), APP_VALUES);

  return (
    <>
      <DocSection id="overview" title={k("H_OVERVIEW")}>
        <p>{k("P_OVERVIEW_1")}</p>
        <p>{k("P_OVERVIEW_2")}</p>
      </DocSection>

      <DocSection id="credentials" title={k("H_CREDENTIALS")}>
        <p>{k("P_CREDENTIALS_1")}</p>
        <DocTable
          headers={[k("TH_CREDENTIAL"), k("TH_SHAPE"), k("TH_OPENS")]}
          rows={[
            [k("CRED_KEY"), <code key="k">sk-...</code>, k("CRED_KEY_OPENS")],
            [k("CRED_TOKEN"), k("CRED_TOKEN_SHAPE"), k("CRED_TOKEN_OPENS")],
          ]}
        />
        <p>{k("P_CREDENTIALS_2")}</p>
        <p>{k("P_CREDENTIALS_3")}</p>
      </DocSection>

      <DocSection id="access-token" title={k("H_ACCESS_TOKEN")}>
        <p>
          {k("P_ACCESS_TOKEN_1_PRE")}
          <DocAppLink href="/settings">{k("P_ACCESS_TOKEN_1_LINK")}</DocAppLink>
          {k("P_ACCESS_TOKEN_1_POST")}
        </p>
        <DocWarning>
          <p>{k("WARN_ACCESS_TOKEN")}</p>
        </DocWarning>
        <p>{k("P_ACCESS_TOKEN_2")}</p>
      </DocSection>

      <DocSection id="catalog" title={k("H_CATALOG")}>
        <p>{k("P_CATALOG_1")}</p>
        <DocCode code={CATALOG_CURL} lang="bash" />
        <DocCode code={CATALOG_JSON} lang="json" />
        <p>{k("P_CATALOG_2")}</p>
        <p>{k("P_CATALOG_3")}</p>
      </DocSection>

      <DocSection id="model-prices" title={k("H_MODEL_PRICES")}>
        <p>{k("P_MODEL_PRICES_1")}</p>
        <DocCode code={MODEL_PRICE_CURL} lang="bash" />
        <DocCode code={MODEL_PRICE_JSON} lang="json" />
        <p>{k("P_MODEL_PRICES_2")}</p>
        <DocCode code={PRICE_FORMULA} lang="text" />
        <p>
          {k("P_MODEL_PRICES_3")}{" "}
          <DocPageLink slug="group-pinning">
            {t("DOCS_PLATFORM.GROUP_PINNING.TITLE")}
          </DocPageLink>
        </p>
      </DocSection>

      <DocSection id="models" title={k("H_MODELS")}>
        <p>{k("P_MODELS_1")}</p>
        <DocCode code={MODELS_CURL} lang="bash" />
        <p>{k("P_MODELS_2")}</p>
        <p>{k("P_MODELS_3")}</p>
      </DocSection>

      <DocSection id="account" title={k("H_ACCOUNT")}>
        <p>{k("P_ACCOUNT_1")}</p>
        <DocCode code={SELF_CURL} lang="bash" />
        <DocCode code={SELF_JSON} lang="json" />
        <p>{k("P_ACCOUNT_2")}</p>
        <p>{k("P_ACCOUNT_3")}</p>
      </DocSection>

      <DocSection id="keys" title={k("H_KEYS")}>
        <p>{k("P_KEYS_1")}</p>
        <DocCode code={KEYS_CURL} lang="bash" />
        <p>{k("P_KEYS_2")}</p>
        <p>{k("P_KEYS_3")}</p>
      </DocSection>

      <DocSection id="usage" title={k("H_USAGE")}>
        <p>{k("P_USAGE_1")}</p>
        <DocCode code={LOGS_CURL} lang="bash" />
        <DocTable
          headers={[k("TH_PARAM"), k("TH_MEANING")]}
          rows={[
            [<code key="a">type</code>, k("PARAM_TYPE")],
            [
              <code key="b">start_timestamp, end_timestamp</code>,
              k("PARAM_RANGE"),
            ],
            [
              <code key="c">model_name, token_name, group</code>,
              k("PARAM_FILTERS"),
            ],
            [
              <code key="d">request_id, upstream_request_id</code>,
              k("PARAM_IDS"),
            ],
          ]}
        />
        <p>{k("P_USAGE_2")}</p>
        <p>{k("P_USAGE_3")}</p>
        <DocCode code={USAGE_CURL} lang="bash" />
        <DocCode code={USAGE_JSON} lang="json" />
      </DocSection>

      <DocSection id="conventions" title={k("H_CONVENTIONS")}>
        <p>{k("P_CONVENTIONS_1")}</p>
        <DocCode code={ENVELOPE_JSON} lang="json" />
        <p>{k("P_CONVENTIONS_2")}</p>
        <p>{k("P_CONVENTIONS_3")}</p>
        <p>{k("P_CONVENTIONS_4")}</p>
      </DocSection>
    </>
  );
}
