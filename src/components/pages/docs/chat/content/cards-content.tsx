import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";
import { chatDocKey } from "../chat-doc-template";
import { DocSection } from "../chat-doc-parts";

const P = "DOCS_CHAT.CARDS";

export async function CardsContent() {
  const t = await getTranslations();
  const k = (leaf: string) => t(chatDocKey(P, leaf), APP_VALUES);

  return (
    <>
      <DocSection id="concept" title={k("H_CONCEPT")}>
        <p>{k("P_CONCEPT_1")}</p>
        <p>{k("P_CONCEPT_2")}</p>
      </DocSection>
      <DocSection id="apply" title={k("H_APPLY")}>
        <p>{k("P_APPLY_1")}</p>
        <p>{k("P_APPLY_2")}</p>
      </DocSection>
      <DocSection id="export" title={k("H_EXPORT")}>
        <p>{k("P_EXPORT_1")}</p>
      </DocSection>
    </>
  );
}
