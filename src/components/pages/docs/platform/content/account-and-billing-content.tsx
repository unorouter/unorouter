import {
  DocPageLink,
  DocSection,
} from "@/components/pages/docs/doc-parts";
import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";
import { platformDocKey } from "../platform-doc-template";

const P = "DOCS_PLATFORM.ACCOUNT_AND_BILLING";

export async function AccountAndBillingContent() {
  const t = await getTranslations();
  const k = (leaf: string) => t(platformDocKey(P, leaf), APP_VALUES);

  return (
    <>
      <DocSection id="balance" title={k("H_BALANCE")}>
        <p>{k("P_BALANCE_1")}</p>
        <p>{k("P_BALANCE_2")}</p>
      </DocSection>
      <DocSection id="topup" title={k("H_TOPUP")}>
        <p>{k("P_TOPUP_1")}</p>
        <p>{k("P_TOPUP_2")}</p>
      </DocSection>
      <DocSection id="earn" title={k("H_EARN")}>
        <p>
          {k("P_EARN_1")}{" "}
          <DocPageLink slug="discord-rewards">
            {t("DOCS_PLATFORM.DISCORD_REWARDS.TITLE")}
          </DocPageLink>
        </p>
        <p>{k("P_EARN_AFFILIATE")}</p>
        <p>{k("P_EARN_2")}</p>
      </DocSection>
      <DocSection id="keys" title={k("H_KEYS")}>
        <p>{k("P_KEYS_1")}</p>
        <p>{k("P_KEYS_2")}</p>
        <p>
          {k("P_KEYS_PIN")}{" "}
          <DocPageLink slug="group-pinning">
            {t("DOCS_PLATFORM.GROUP_PINNING.TITLE")}
          </DocPageLink>
        </p>
      </DocSection>
      <DocSection id="charges" title={k("H_CHARGES")}>
        <p>{k("P_CHARGES_1")}</p>
        <p>{k("P_CHARGES_2")}</p>
        <p>{k("P_CHARGES_3")}</p>
      </DocSection>
      <DocSection id="logs" title={k("H_LOGS")}>
        <p>{k("P_LOGS_1")}</p>
      </DocSection>
    </>
  );
}
