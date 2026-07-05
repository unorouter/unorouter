import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";
import { chatDocKey } from "../chat-doc-template";
import { DocSection } from "../chat-doc-parts";

const P = "DOCS_CHAT.PERSONAS";

export async function PersonasContent() {
  const t = await getTranslations();
  const k = (leaf: string) => t(chatDocKey(P, leaf), APP_VALUES);

  return (
    <>
      <DocSection id="fields" title={k("H_FIELDS")}>
        <p>{k("P_FIELDS_1")}</p>
        <p>{k("P_FIELDS_2")}</p>
      </DocSection>
      <DocSection id="default" title={k("H_DEFAULT")}>
        <p>{k("P_DEFAULT_1")}</p>
      </DocSection>
      <DocSection id="import" title={k("H_IMPORT")}>
        <p>{k("P_IMPORT_1")}</p>
      </DocSection>
    </>
  );
}
