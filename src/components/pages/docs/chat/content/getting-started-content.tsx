import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";
import { chatDocKey } from "../chat-doc-template";
import { DocKbd, DocSection } from "../chat-doc-parts";

const P = "DOCS_CHAT.GETTING_STARTED";

export async function GettingStartedContent() {
  const t = await getTranslations();
  const k = (leaf: string) => t(chatDocKey(P, leaf), APP_VALUES);

  return (
    <>
      <DocSection id="overview" title={k("H_OVERVIEW")}>
        <p>{k("P_OVERVIEW_1")}</p>
        <p>{k("P_OVERVIEW_2")}</p>
      </DocSection>
      <DocSection id="loadout" title={k("H_LOADOUT")}>
        <p>{k("P_LOADOUT_1")}</p>
        <p>{k("P_LOADOUT_2")}</p>
      </DocSection>
      <DocSection id="greetings" title={k("H_GREETINGS")}>
        <p>{k("P_GREETINGS_1")}</p>
        <p>{k("P_GREETINGS_2")}</p>
      </DocSection>
      <DocSection id="messages" title={k("H_MESSAGES")}>
        <p>{k("P_MESSAGES_1")}</p>
        <p>{k("P_MESSAGES_2")}</p>
        <p>{k("P_MESSAGES_3")}</p>
      </DocSection>
      <DocSection id="auto-continue" title={k("H_AUTOCONTINUE")}>
        <p>{k("P_AUTOCONTINUE_1")}</p>
      </DocSection>
      <DocSection id="next" title={k("H_NEXT")}>
        <p>{k("P_NEXT_1")}</p>
        <p>
          <DocKbd>Ctrl K</DocKbd> {k("P_NEXT_2")}
        </p>
      </DocSection>
    </>
  );
}
