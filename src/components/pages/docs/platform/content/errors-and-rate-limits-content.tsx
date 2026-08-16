import {
  DocCode,
  DocImage,
  DocKbd,
  DocPageLink,
  DocSection,
  DocTable,
} from "@/components/pages/docs/doc-parts";
import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";
import { platformDocKey } from "../platform-doc-template";

const P = "DOCS_PLATFORM.ERRORS_AND_RATE_LIMITS";

const ENVELOPE_EXAMPLE = `{
  "error": {
    "message": "Model \\"gpt-5.5-typo\\" is not offered here. Check the model name for typos, or switch to a model from our supported list. (request id: 20260705...)",
    "type": "new_api_error",
    "code": "model_not_found"
  }
}`;

const BUSY_EXAMPLE = `HTTP/1.1 503 Service Unavailable

{
  "error": {
    "message": "All providers for model \\"kimi-k2.6:free\\" are busy right now (they hit their rate limit). This is not a spelling error. Please try again in a little while, or switch to another model. (request id: 20260705...)",
    "type": "new_api_error",
    "code": "get_channel_failed"
  }
}`;

const RATE_LIMIT_HEADERS = `HTTP/1.1 429 Too Many Requests
Retry-After: 38
X-RateLimit-Limit: 1
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1783198478`;

export async function ErrorsAndRateLimitsContent() {
  const t = await getTranslations();
  const k = (leaf: string) => t(platformDocKey(P, leaf), APP_VALUES);

  const statusRows = (
    [
      ["400", "R_400"],
      ["401", "R_401"],
      ["402", "R_402"],
      ["403", "R_403"],
      ["413", "R_413"],
      ["429", "R_429"],
      ["500", "R_500"],
      ["503", "R_503"],
    ] as const
  ).map(([code, leaf]) => [
    <DocKbd key={code}>{code}</DocKbd>,
    k(`${leaf}_MEANING`),
    k(`${leaf}_ACTION`),
  ]);

  return (
    <>
      <DocSection id="rate-limits" title={k("H_RATE_LIMITS")}>
        <p>{k("P_RATE_LIMITS_1")}</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>{k("L_RATE_LIMITS_OURS")}</li>
          <li>{k("L_RATE_LIMITS_UPSTREAM")}</li>
          <li>{k("L_RATE_LIMITS_DAILY")}</li>
          <li>{k("L_RATE_LIMITS_TPM")}</li>
          <li>{k("L_RATE_LIMITS_CONCURRENCY")}</li>
        </ul>
        <p>{k("P_RATE_LIMITS_2")}</p>
      </DocSection>
      <DocSection id="free-model-limit" title={k("H_FREE_MODEL_LIMIT")}>
        <p>{k("P_FREE_MODEL_LIMIT_1")}</p>
        <DocCode code={RATE_LIMIT_HEADERS} lang="text" />
        <p>{k("P_FREE_MODEL_LIMIT_2")}</p>
      </DocSection>
      <DocSection id="trial-caps" title={k("H_TRIAL_CAPS")}>
        <p>{k("P_TRIAL_CAPS_1")}</p>
        <p>{k("P_TRIAL_CAPS_2")}</p>
      </DocSection>
      <DocSection id="envelope" title={k("H_ENVELOPE")}>
        <p>{k("P_ENVELOPE_1")}</p>
        <DocCode code={ENVELOPE_EXAMPLE} lang="json" />
        <p>{k("P_ENVELOPE_2")}</p>
        <p>
          {k("P_ENVELOPE_SETUP")}{" "}
          <DocPageLink slug="quickstart">
            {t("DOCS_PLATFORM.QUICKSTART.TITLE")}
          </DocPageLink>
        </p>
      </DocSection>
      <DocSection id="status-codes" title={k("H_STATUS_CODES")}>
        <p>{k("P_STATUS_CODES_1")}</p>
        <DocTable
          headers={[k("T_CODE"), k("T_MEANING"), k("T_ACTION")]}
          rows={statusRows}
        />
      </DocSection>
      <DocSection id="busy-vs-unknown" title={k("H_BUSY_VS_UNKNOWN")}>
        <p>{k("P_BUSY_VS_UNKNOWN_1")}</p>
        <DocCode code={BUSY_EXAMPLE} lang="text" />
        <p>{k("P_BUSY_VS_UNKNOWN_2")}</p>
        <p>{k("P_BUSY_VS_UNKNOWN_3")}</p>
        <DocImage
          src="/images/docs/errors-status.webp"
          alt={k("ALT_STATUS")}
          width={1380}
          height={650}
        />
        <p>
          {k("P_BUSY_WATCH")}{" "}
          <DocPageLink slug="notifications">
            {t("DOCS_PLATFORM.NOTIFICATIONS.TITLE")}
          </DocPageLink>
        </p>
        <p>
          {k("P_BUSY_PINNED")}{" "}
          <DocPageLink slug="group-pinning">
            {t("DOCS_PLATFORM.GROUP_PINNING.TITLE")}
          </DocPageLink>
        </p>
      </DocSection>
      <DocSection id="retries" title={k("H_RETRIES")}>
        <p>{k("P_RETRIES_1")}</p>
        <p>
          {k("P_RETRIES_2")}{" "}
          <DocPageLink slug="account-and-billing">
            {t("DOCS_PLATFORM.ACCOUNT_AND_BILLING.TITLE")}
          </DocPageLink>
        </p>
      </DocSection>
    </>
  );
}
