import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";
import { chatDocKey } from "../chat-doc-template";
import {
  DocCode,
  DocKbd,
  DocSection,
  DocTable,
} from "@/components/pages/docs/doc-parts";

const P = "DOCS_CHAT.LOREBOOKS";

export async function LorebooksContent() {
  const t = await getTranslations();
  const k = (leaf: string) => t(chatDocKey(P, leaf), APP_VALUES);

  return (
    <>
      <DocSection id="books" title={k("H_BOOKS")}>
        <p>{k("P_BOOKS_1")}</p>
        <DocTable
          headers={[k("TH_SETTING"), k("TH_RANGE"), k("TH_EFFECT")]}
          rows={[
            [<DocKbd key="s">scanDepth</DocKbd>, "0-100", k("S_SCAN_DEPTH")],
            [
              <DocKbd key="s">tokenBudget</DocKbd>,
              "100-32000",
              k("S_TOKEN_BUDGET"),
            ],
            [
              <DocKbd key="s">recursiveScanning</DocKbd>,
              k("V_ON_OFF"),
              k("S_RECURSIVE"),
            ],
          ]}
        />
      </DocSection>
      <DocSection id="entries" title={k("H_ENTRIES")}>
        <p>{k("P_ENTRIES_1")}</p>
        <p>{k("P_ENTRIES_2")}</p>
        <p>{k("P_ENTRIES_3")}</p>
      </DocSection>
      <DocSection id="ordering" title={k("H_ORDERING")}>
        <p>{k("P_ORDERING_1")}</p>
        <p>{k("P_ORDERING_2")}</p>
      </DocSection>
      <DocSection id="injection" title={k("H_INJECTION")}>
        <p>{k("P_INJECTION_1")}</p>
        <p>{k("P_INJECTION_2")}</p>
      </DocSection>
      <DocSection id="decorators" title={k("H_DECORATORS")}>
        <p>{k("P_DECORATORS_1")}</p>
        <DocCode
          code={`@@probability 50
@@scan_depth 8
@@role assistant
@@activate_only_after 4
@@keep`}
        />
        <DocTable
          headers={[k("TH_DECORATOR"), k("TH_EFFECT")]}
          rows={[
            [<DocKbd key="d">@@probability</DocKbd>, k("D_PROBABILITY")],
            [<DocKbd key="d">@@scan_depth</DocKbd>, k("D_SCAN_DEPTH")],
            [<DocKbd key="d">@@order / @@priority</DocKbd>, k("D_ORDER")],
            [<DocKbd key="d">@@role</DocKbd>, k("D_ROLE")],
            [
              <DocKbd key="d">
                @@activate_only_after / @@activate_only_every
              </DocKbd>,
              k("D_ACTIVATE"),
            ],
            [
              <DocKbd key="d">@@keep / @@dont_activate_after_match</DocKbd>,
              k("D_STICKY"),
            ],
            [<DocKbd key="d">@@is_greeting</DocKbd>, k("D_GREETING")],
          ]}
        />
      </DocSection>
      <DocSection id="budget" title={k("H_BUDGET")}>
        <p>{k("P_BUDGET_1")}</p>
        <p>{k("P_BUDGET_2")}</p>
      </DocSection>
    </>
  );
}
