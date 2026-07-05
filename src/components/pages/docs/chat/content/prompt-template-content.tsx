import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";
import { chatDocKey } from "../chat-doc-template";
import { DocCode, DocSection } from "../chat-doc-parts";

const P = "DOCS_CHAT.PROMPT_TEMPLATE";

export async function PromptTemplateContent() {
  const t = await getTranslations();
  const k = (leaf: string) => t(chatDocKey(P, leaf), APP_VALUES);

  return (
    <>
      <DocSection id="concept" title={k("H_CONCEPT")}>
        <p>{k("P_CONCEPT_1")}</p>
        <p>{k("P_CONCEPT_2")}</p>
      </DocSection>
      <DocSection id="blocks" title={k("H_BLOCKS")}>
        <p>{k("P_BLOCKS_1")}</p>
        <p>{k("P_BLOCKS_2")}</p>
        <p>{k("P_BLOCKS_3")}</p>
      </DocSection>
      <DocSection id="order" title={k("H_ORDER")}>
        <p>{k("P_ORDER_1")}</p>
        <DocCode
          code={`main prompt
lorebook entries
character blocks
persona
system prompt
example messages
[chat history]
post-history instructions`}
        />
        <p>{k("P_ORDER_2")}</p>
      </DocSection>
      <DocSection id="tips" title={k("H_TIPS")}>
        <p>{k("P_TIPS_1")}</p>
        <p>{k("P_TIPS_2")}</p>
      </DocSection>
    </>
  );
}
