import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";
import { chatDocKey } from "../chat-doc-template";
import { DocSection } from "../chat-doc-parts";

const P = "DOCS_CHAT.MEMORY_AND_CONTEXT";

export async function MemoryAndContextContent() {
  const t = await getTranslations();
  const k = (leaf: string) => t(chatDocKey(P, leaf), APP_VALUES);

  return (
    <>
      <DocSection id="summary" title={k("H_SUMMARY")}>
        <p>{k("P_SUMMARY_1")}</p>
        <p>{k("P_SUMMARY_2")}</p>
      </DocSection>
      <DocSection id="retrieval" title={k("H_RETRIEVAL")}>
        <p>{k("P_RETRIEVAL_1")}</p>
      </DocSection>
      <DocSection id="web-search" title={k("H_WEBSEARCH")}>
        <p>{k("P_WEBSEARCH_1")}</p>
        <p>{k("P_WEBSEARCH_2")}</p>
      </DocSection>
      <DocSection id="settings" title={k("H_SETTINGS")}>
        <p>{k("P_SETTINGS_1")}</p>
      </DocSection>
    </>
  );
}
