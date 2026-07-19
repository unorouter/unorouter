import {
  DocKbd,
  DocPageLink,
  DocSection,
} from "@/components/pages/docs/doc-parts";
import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";
import { platformDocKey } from "../platform-doc-template";

const P = "DOCS_PLATFORM.MODELS_AND_PRICING";

export async function ModelsAndPricingContent() {
  const t = await getTranslations();
  const k = (leaf: string) => t(platformDocKey(P, leaf), APP_VALUES);

  return (
    <>
      <DocSection id="catalog" title={k("H_CATALOG")}>
        <p>{k("P_CATALOG_1")}</p>
        <p>{k("P_CATALOG_2")}</p>
      </DocSection>
      <DocSection id="free-vs-paid" title={k("H_FREE_VS_PAID")}>
        <p>
          {k("P_FREE_VS_PAID_1")} <DocKbd>gpt-oss-120b:free</DocKbd>
        </p>
        <p>{k("P_FREE_VS_PAID_2")}</p>
        <p>{k("P_FREE_VS_PAID_3")}</p>
      </DocSection>
      <DocSection id="discounts" title={k("H_DISCOUNTS")}>
        <p>{k("P_DISCOUNTS_1")}</p>
        <p>
          {k("P_DISCOUNTS_PIN")}{" "}
          <DocPageLink slug="group-pinning">
            {t("DOCS_PLATFORM.GROUP_PINNING.TITLE")}
          </DocPageLink>
        </p>
      </DocSection>
      <DocSection id="pricing" title={k("H_PRICING")}>
        <p>{k("P_PRICING_1")}</p>
        <p>{k("P_PRICING_2")}</p>
      </DocSection>
      <DocSection id="prompt-cache" title={k("H_PROMPT_CACHE")}>
        <p>{k("P_PROMPT_CACHE_1")}</p>
        <p>{k("P_PROMPT_CACHE_2")}</p>
      </DocSection>
      <DocSection id="availability" title={k("H_AVAILABILITY")}>
        <p>{k("P_AVAILABILITY_1")}</p>
        <p>{k("P_AVAILABILITY_2")}</p>
        <p>
          {k("P_AVAILABILITY_WATCH")}{" "}
          <DocPageLink slug="notifications">
            {t("DOCS_PLATFORM.NOTIFICATIONS.TITLE")}
          </DocPageLink>
        </p>
      </DocSection>
    </>
  );
}
