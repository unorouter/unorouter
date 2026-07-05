import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";
import { chatDocKey } from "../chat-doc-template";
import { DocKbd, DocSection, DocTable } from "../chat-doc-parts";

const P = "DOCS_CHAT.CHARACTERS";

export async function CharactersContent() {
  const t = await getTranslations();
  const k = (leaf: string) => t(chatDocKey(P, leaf), APP_VALUES);

  return (
    <>
      <DocSection id="fields" title={k("H_FIELDS")}>
        <p>{k("P_FIELDS_1")}</p>
        <DocTable
          headers={[k("TH_FIELD"), k("TH_PURPOSE")]}
          rows={[
            [<DocKbd key="f">{k("F_NAME")}</DocKbd>, k("F_NAME_DESC")],
            [
              <DocKbd key="f">{k("F_DESCRIPTION")}</DocKbd>,
              k("F_DESCRIPTION_DESC"),
            ],
            [
              <DocKbd key="f">{k("F_PERSONALITY")}</DocKbd>,
              k("F_PERSONALITY_DESC"),
            ],
            [<DocKbd key="f">{k("F_SCENARIO")}</DocKbd>, k("F_SCENARIO_DESC")],
            [
              <DocKbd key="f">{k("F_FIRST_MESSAGE")}</DocKbd>,
              k("F_FIRST_MESSAGE_DESC"),
            ],
            [<DocKbd key="f">{k("F_EXAMPLES")}</DocKbd>, k("F_EXAMPLES_DESC")],
            [<DocKbd key="f">{k("F_AVATAR")}</DocKbd>, k("F_AVATAR_DESC")],
          ]}
        />
      </DocSection>
      <DocSection id="prompt-fields" title={k("H_PROMPT_FIELDS")}>
        <p>{k("P_PROMPT_FIELDS_1")}</p>
        <p>{k("P_PROMPT_FIELDS_2")}</p>
      </DocSection>
      <DocSection id="behavior" title={k("H_BEHAVIOR")}>
        <p>{k("P_BEHAVIOR_1")}</p>
        <p>{k("P_BEHAVIOR_2")}</p>
      </DocSection>
      <DocSection id="import" title={k("H_IMPORT")}>
        <p>{k("P_IMPORT_1")}</p>
        <p>{k("P_IMPORT_2")}</p>
      </DocSection>
      <DocSection id="export" title={k("H_EXPORT")}>
        <p>{k("P_EXPORT_1")}</p>
        <DocTable
          headers={[k("TH_FORMAT"), k("TH_USE")]}
          rows={[
            [<DocKbd key="f">png</DocKbd>, k("X_PNG")],
            [<DocKbd key="f">charx</DocKbd>, k("X_CHARX")],
            [<DocKbd key="f">voxta</DocKbd>, k("X_VOXTA")],
            [<DocKbd key="f">json</DocKbd>, k("X_JSON")],
          ]}
        />
      </DocSection>
    </>
  );
}
