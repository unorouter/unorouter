import {
  DocAppLink,
  DocCode,
  DocImage,
  DocKbd,
  DocSection,
  DocTable,
  DocWarning,
} from "@/components/pages/docs/doc-parts";
import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";
import { platformDocKey } from "../platform-doc-template";

const P = "DOCS_PLATFORM.CONSENTS";

export const CONSENT_ERROR = `HTTP/1.1 403 Forbidden

{
  "error": {
    "code": "consent_required",
    "message": "claude-opus-5.5 needs your consent for these providers: relay-a (China), relay-b (Indonesia), relay-c (Hong Kong). Give it once at https://${APP_VALUES.appDomain}/consents?model=claude-opus-5.5; it covers every model these providers serve. (request id: ...)",
    "param": "CN-19,ID-01,HK-01",
    "type": "new_api_error"
  }
}`;

const CLIENT_SNIPPET = `const model = "claude-opus-5.5";
const res = await fetch("https://api.${APP_VALUES.appDomain}/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.UNOROUTER_API_KEY}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ model, messages: [{ role: "user", content: "Hello" }] }),
});

if (res.status === 403) {
  const body = await res.json();
  if (body.error?.code === "consent_required") {
    // The message names the providers; the consent page for the model:
    const link = \`https://${APP_VALUES.appDomain}/consents?model=\${encodeURIComponent(model)}\`;
    showToUser(\`\${body.error.message}\\n\${link}\`);
  }
}`;

export async function ConsentsContent() {
  const t = await getTranslations();
  const k = (leaf: string) => t(platformDocKey(P, leaf), APP_VALUES);

  const codeRows = (
    [
      ["consent_required", "R_REQUIRED"],
      ["consent_business", "R_BUSINESS"],
      ["own_purpose_objected", "R_OBJECTED"],
    ] as const
  ).map(([code, leaf]) => [<DocKbd key={code}>{code}</DocKbd>, k(leaf)]);

  return (
    <>
      <DocSection id="why" title={k("H_WHY")}>
        <p>{k("P_WHY_1")}</p>
        <p>{k("P_WHY_2")}</p>
        <p>{k("P_WHY_3")}</p>
        <p>
          {k("P_WHY_LINKS_PRE")}
          <DocAppLink href="/privacy">{k("P_WHY_LINK_PRIVACY")}</DocAppLink>
          {k("P_WHY_LINKS_MID")}
          <DocAppLink href="/terms">{k("P_WHY_LINK_TERMS")}</DocAppLink>
          {k("P_WHY_LINKS_POST")}
        </p>
      </DocSection>
      <DocSection id="how" title={k("H_HOW")}>
        <p>
          {k("P_HOW_1_PRE")}
          <DocAppLink href="/consents">{k("P_HOW_1_LINK")}</DocAppLink>
          {k("P_HOW_1_POST")}
        </p>
        <DocImage
          src="/images/docs/consents-providers.webp"
          alt={k("ALT_PROVIDERS")}
          width={1600}
          height={733}
          priority
        />
        <p>{k("P_HOW_2")}</p>
        <DocImage
          src="/images/docs/consents-model.webp"
          alt={k("ALT_MODEL")}
          width={1600}
          height={433}
        />
        <p>{k("P_HOW_3")}</p>
        <DocImage
          src="/images/docs/consents-dialog.webp"
          alt={k("ALT_DIALOG")}
          width={560}
          height={1105}
          natural
        />
        <p>{k("P_HOW_GUEST")}</p>
      </DocSection>
      <DocSection id="objection" title={k("H_OBJECTION")}>
        <p>{k("P_OBJECTION_1")}</p>
        <DocImage
          src="/images/docs/consents-objection.webp"
          alt={k("ALT_OBJECTION")}
          width={1600}
          height={98}
        />
      </DocSection>
      <DocSection id="api" title={k("H_API")}>
        <p>{k("P_API_1")}</p>
        <DocCode code={CONSENT_ERROR} lang="json" />
        <p>{k("P_API_2")}</p>
        <DocCode code={CLIENT_SNIPPET} lang="typescript" />
        <DocTable headers={[k("TH_CODE"), k("TH_MEANING")]} rows={codeRows} />
      </DocSection>
      <DocSection id="rollout" title={k("H_ROLLOUT")}>
        <DocWarning>
          <p>{k("P_ROLLOUT")}</p>
        </DocWarning>
      </DocSection>
    </>
  );
}
