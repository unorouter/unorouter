import {
  DocKbd,
  DocPageLink,
  DocSection,
  DocTable,
} from "@/components/pages/docs/doc-parts";
import { APP_VALUES } from "@/lib/config/constants";
import { getRewardAmounts } from "@/lib/config/rewards";
import { getLocale, getTranslations } from "next-intl/server";
import { platformDocKey } from "../platform-doc-template";

const P = "DOCS_PLATFORM.DISCORD_REWARDS";

export async function DiscordRewardsContent() {
  const t = await getTranslations();
  const locale = await getLocale();
  const rewards = await getRewardAmounts(locale);
  // ICU values take scalars, so the level rows stay out of this object.
  const values = {
    ...APP_VALUES,
    connectReward: rewards.connectReward,
    voteReward: rewards.voteReward,
    boostReward: rewards.boostReward,
    inviteReward: rewards.inviteReward,
    tagReward: rewards.tagReward,
    levelMin: rewards.levelMin,
    levelMax: rewards.levelMax,
    levelTotal: rewards.levelTotal,
  };
  const k = (leaf: string) => t(platformDocKey(P, leaf), values);

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
            [k("R_CONNECT_ACTION"), k("R_CONNECT_REWARD"), k("F_ONCE")],
            [k("R_BOOST_ACTION"), k("R_BOOST_REWARD"), k("F_BOOST")],
            [k("R_VOTE_ACTION"), k("R_VOTE_REWARD"), k("F_VOTE")],
            [k("R_INVITE_ACTION"), k("R_INVITE_REWARD"), k("F_INVITE")],
            [k("R_LEVEL_ACTION"), k("R_LEVEL_REWARD"), k("F_LEVEL")],
            [k("R_TAG_ACTION"), k("R_TAG_REWARD"), k("F_TAG")],
            [k("R_BOUNTY_ACTION"), k("R_BOUNTY_REWARD"), k("F_BOUNTY")],
          ]}
        />
        <p>{k("P_REWARDS_2")}</p>
        <p>
          {k("P_REWARDS_SPEND")}{" "}
          <DocPageLink slug="account-and-billing">
            {t("DOCS_PLATFORM.ACCOUNT_AND_BILLING.TITLE")}
          </DocPageLink>
        </p>
        <p>
          {k("P_REWARDS_MODELS")}{" "}
          <DocPageLink slug="models-and-pricing">
            {t("DOCS_PLATFORM.MODELS_AND_PRICING.TITLE")}
          </DocPageLink>
        </p>
      </DocSection>
      <DocSection id="recurring" title={k("H_RECURRING")}>
        <p>{k("P_BOOST_1")}</p>
        <p>{k("P_BOOST_2")}</p>
        <p>{k("P_VOTE_1")}</p>
        <p>{k("P_VOTE_2")}</p>
      </DocSection>
      <DocSection id="invites" title={k("H_INVITES")}>
        <p>{k("P_INVITES_1")}</p>
        <p className="text-foreground font-medium">{k("P_INVITES_VANITY")}</p>
        <p>{k("P_INVITES_2")}</p>
        <p>{k("P_INVITES_3")}</p>
      </DocSection>
      <DocSection id="tag" title={k("H_TAG")}>
        <p>{k("P_TAG_1")}</p>
        <p>{k("P_TAG_2")}</p>
        <p>{k("P_TAG_3")}</p>
      </DocSection>
      <DocSection id="levels" title={k("H_LEVELS")}>
        <p>{k("P_LEVELS_1")}</p>
        <DocTable
          headers={[k("T_LEVEL"), k("T_ROLE"), k("T_MESSAGES"), k("T_REWARD")]}
          rows={rewards.levels.map((level, i) => [
            String(i),
            level.role,
            level.messages,
            t(platformDocKey(P, "LEVEL_REWARD_CELL"), {
              ...values,
              amount: level.reward,
            }),
          ])}
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
          <li>{k("R_RULE_TAG")}</li>
          <li>{k("R_RULE_5")}</li>
          <li>{k("R_RULE_6")}</li>
          <li>{k("R_RULE_7")}</li>
        </ul>
      </DocSection>
    </>
  );
}
