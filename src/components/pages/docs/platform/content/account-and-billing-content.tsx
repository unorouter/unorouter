import { DocSection, DocTable } from "@/components/pages/docs/doc-parts";
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
        <p>{k("P_EARN_1")}</p>
        <DocTable
          headers={[k("T_ACTION"), k("T_REWARD")]}
          rows={[
            [k("R_VERIFY_ACTION"), k("R_VERIFY_REWARD")],
            [k("R_BOOST_ACTION"), k("R_BOOST_REWARD")],
            [k("R_VOTE_ACTION"), k("R_VOTE_REWARD")],
            [k("R_BOUNTY_ACTION"), k("R_BOUNTY_REWARD")],
            [k("R_AFFILIATE_ACTION"), k("R_AFFILIATE_REWARD")],
            [k("R_ACTIVE_ACTION"), k("R_ACTIVE_REWARD")],
          ]}
        />
        <p>{k("P_EARN_2")}</p>
      </DocSection>
      <DocSection id="levels" title={k("H_LEVELS")}>
        <p>{k("P_LEVELS_1")}</p>
        <DocTable
          headers={[k("T_LEVEL"), k("T_ROLE"), k("T_MESSAGES"), k("T_REWARD")]}
          rows={[
            ["0", k("L_0_ROLE"), "10", "$0.05"],
            ["1", k("L_1_ROLE"), "100", "$0.10"],
            ["2", k("L_2_ROLE"), "500", "$0.25"],
            ["3", k("L_3_ROLE"), "1,000", "$0.50"],
            ["4", k("L_4_ROLE"), "2,500", "$1.00"],
            ["5", k("L_5_ROLE"), "5,000", "$2.00"],
            ["6", k("L_6_ROLE"), "10,000", "$5.00"],
            ["7", k("L_7_ROLE"), "25,000", "$10.00"],
            ["8", k("L_8_ROLE"), "50,000", "$25.00"],
          ]}
        />
        <p>{k("P_LEVELS_2")}</p>
      </DocSection>
      <DocSection id="keys" title={k("H_KEYS")}>
        <p>{k("P_KEYS_1")}</p>
        <p>{k("P_KEYS_2")}</p>
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
