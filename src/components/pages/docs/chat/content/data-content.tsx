import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";
import { chatDocKey } from "../chat-doc-template";
import { DocKbd, DocSection, DocTable } from "@/components/pages/docs/doc-parts";

const P = "DOCS_CHAT.DATA";

export async function DataContent() {
  const t = await getTranslations();
  const k = (leaf: string) => t(chatDocKey(P, leaf), APP_VALUES);

  return (
    <>
      <DocSection id="conversations" title={k("H_CONVERSATIONS")}>
        <p>{k("P_CONVERSATIONS_1")}</p>
        <DocTable
          headers={[k("TH_FORMAT"), k("TH_USE")]}
          rows={[
            [<DocKbd key="f">unorouter.1.0</DocKbd>, k("X_NATIVE")],
            [<DocKbd key="f">orpg.3.0</DocKbd>, k("X_ORPG")],
            [<DocKbd key="f">SillyTavern JSONL</DocKbd>, k("X_ST")],
          ]}
        />
      </DocSection>
      <DocSection id="entities" title={k("H_ENTITIES")}>
        <p>{k("P_ENTITIES_1")}</p>
        <p>{k("P_ENTITIES_2")}</p>
      </DocSection>
      <DocSection id="inspect" title={k("H_INSPECT")}>
        <p>{k("P_INSPECT_1")}</p>
        <p>{k("P_INSPECT_2")}</p>
      </DocSection>
      <DocSection id="db" title={k("H_DB")}>
        <p>{k("P_DB_1")}</p>
        <p>{k("P_DB_2")}</p>
      </DocSection>
    </>
  );
}
