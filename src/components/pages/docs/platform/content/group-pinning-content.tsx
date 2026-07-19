import {
  DocCode,
  DocImage,
  DocPageLink,
  DocSection,
} from "@/components/pages/docs/doc-parts";
import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";
import { platformDocKey } from "../platform-doc-template";

const P = "DOCS_PLATFORM.GROUP_PINNING";

const PINNED_ERROR = `{
  "error": {
    "message": "Your pinned provider groups for model \\"glm-5.2\\" are currently unavailable, but the model is still served by other providers. Edit this key's group override, or try again later.",
    "type": "new_api_error",
    "code": "get_channel_failed"
  }
}`;

export async function GroupPinningContent() {
  const t = await getTranslations();
  const k = (leaf: string) => t(platformDocKey(P, leaf), APP_VALUES);

  return (
    <>
      <DocSection id="overview" title={k("H_OVERVIEW")}>
        <p>{k("P_OVERVIEW_1")}</p>
        <p>{k("P_OVERVIEW_2")}</p>
      </DocSection>
      <DocSection id="prices" title={k("H_PRICES")}>
        <p>{k("P_PRICES_1")}</p>
        <DocImage
          src="/images/docs/pinning-group-prices.webp"
          alt={k("ALT_GROUP_PRICES")}
          width={1220}
          height={371}
        />
      </DocSection>
      <DocSection id="pinning" title={k("H_PINNING")}>
        <p>{k("P_PINNING_1")}</p>
        <DocImage
          src="/images/docs/pinning-token-mapping.webp"
          alt={k("ALT_MAPPING")}
          width={928}
          height={330}
        />
        <p>{k("P_PINNING_2")}</p>
      </DocSection>
      <DocSection id="routing" title={k("H_ROUTING")}>
        <p>{k("P_ROUTING_1")}</p>
        <p>{k("P_ROUTING_2")}</p>
        <p>
          {k("P_SEE_NOTIFY")}{" "}
          <DocPageLink slug="notifications">
            {t("DOCS_PLATFORM.NOTIFICATIONS.TITLE")}
          </DocPageLink>
        </p>
      </DocSection>
      <DocSection id="errors" title={k("H_ERRORS")}>
        <p>{k("P_ERRORS_1")}</p>
        <DocCode code={PINNED_ERROR} lang="json" />
        <p>{k("P_ERRORS_2")}</p>
      </DocSection>
    </>
  );
}
