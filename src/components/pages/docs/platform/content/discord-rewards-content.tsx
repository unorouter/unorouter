import {
  DocKbd,
  DocSection,
  DocTable,
} from "@/components/pages/docs/doc-parts";
import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";
import { platformDocKey } from "../platform-doc-template";

const P = "DOCS_PLATFORM.DISCORD_REWARDS";

export async function DiscordRewardsContent() {
  const t = await getTranslations();
  const k = (leaf: string) => t(platformDocKey(P, leaf), APP_VALUES);

  return (
    <>
      <DocSection id="overview" title={k("H_OVERVIEW")}>
        <p>{k("P_OVERVIEW_1")}</p>
        <p>{k("P_OVERVIEW_2")}</p>
      </DocSection>
      <DocSection id="link" title={k("H_LINK")}>
        <p>{k("P_LINK_1")}</p>
        <p>{k("P_LINK_2")}</p>
      </DocSection>
      <DocSection id="rewards" title={k("H_REWARDS")}>
        <p>{k("P_REWARDS_1")}</p>
        <DocTable
          headers={[k("T_ACTION"), k("T_REWARD"), k("T_FREQUENCY")]}
          rows={[
            [k("R_CONNECT_ACTION"), "$1", k("F_ONCE")],
            [k("R_BOOST_ACTION"), k("R_BOOST_REWARD"), k("F_BOOST")],
            [k("R_VOTE_ACTION"), k("R_VOTE_REWARD"), k("F_VOTE")],
            [k("R_INVITE_ACTION"), k("R_INVITE_REWARD"), k("F_INVITE")],
            [k("R_LEVEL_ACTION"), k("R_LEVEL_REWARD"), k("F_LEVEL")],
            [k("R_BOUNTY_ACTION"), k("R_BOUNTY_REWARD"), k("F_BOUNTY")],
          ]}
        />
        <p>{k("P_REWARDS_2")}</p>
      </DocSection>
      <DocSection id="recurring" title={k("H_RECURRING")}>
        <p>{k("P_BOOST_1")}</p>
        <p>{k("P_BOOST_2")}</p>
        <p>{k("P_VOTE_1")}</p>
        <p>{k("P_VOTE_2")}</p>
      </DocSection>
      <DocSection id="levels" title={k("H_LEVELS")}>
        <p>{k("P_LEVELS_1")}</p>
        <DocTable
          headers={[k("T_LEVEL"), k("T_ROLE"), k("T_MESSAGES"), k("T_REWARD")]}
          rows={[
            ["0", "Prompt Newbie!", "10", "$0.05"],
            ["1", "Token Spender!", "100", "$0.10"],
            ["2", "Context Filler!", "500", "$0.25"],
            ["3", "Fine Tuner!", "1,000", "$0.50"],
            ["4", "Prompt Engineer!", "2,500", "$1.00"],
            ["5", "Model Wrangler!", "5,000", "$2.00"],
            ["6", "Agent Architect!", "10,000", "$5.00"],
            ["7", "RP Maestro!", "25,000", "$10.00"],
            ["8", "AGI Whisperer!", "50,000", "$25.00"],
          ]}
        />
        <p>{k("P_LEVELS_2")}</p>
      </DocSection>
      <DocSection id="bounty" title={k("H_BOUNTY")}>
        <p>{k("P_BOUNTY_1")}</p>
        <p>{k("P_BOUNTY_2")}</p>
      </DocSection>
      <DocSection id="notifications" title={k("H_NOTIFICATIONS")}>
        <p>{k("P_NOTIF_1")}</p>
        <p>
          {k("P_NOTIF_2")} <DocKbd>/notifications</DocKbd>
        </p>
      </DocSection>
      <DocSection id="rules" title={k("H_RULES")}>
        <ul className="list-disc space-y-2 pl-5">
          <li>{k("R_RULE_1")}</li>
          <li>{k("R_RULE_2")}</li>
          <li>{k("R_RULE_3")}</li>
          <li>{k("R_RULE_4")}</li>
          <li>{k("R_RULE_5")}</li>
          <li>{k("R_RULE_6")}</li>
          <li>{k("R_RULE_7")}</li>
        </ul>
      </DocSection>
    </>
  );
}
