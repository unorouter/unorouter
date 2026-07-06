import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";
import { chatDocKey } from "../chat-doc-template";
import {
  DocCode,
  DocKbd,
  DocSection,
  DocTable,
} from "@/components/pages/docs/doc-parts";

const P = "DOCS_CHAT.REGEX_SCRIPTS";

export async function RegexScriptsContent() {
  const t = await getTranslations();
  const k = (leaf: string) => t(chatDocKey(P, leaf), APP_VALUES);

  return (
    <>
      <DocSection id="modes" title={k("H_MODES")}>
        <p>{k("P_MODES_1")}</p>
        <DocTable
          headers={[k("TH_MODE"), k("TH_RUNS")]}
          rows={[
            [<DocKbd key="m">editinput</DocKbd>, k("MODE_INPUT")],
            [<DocKbd key="m">editoutput</DocKbd>, k("MODE_OUTPUT")],
            [<DocKbd key="m">editprocess</DocKbd>, k("MODE_PROCESS")],
            [<DocKbd key="m">editdisplay</DocKbd>, k("MODE_DISPLAY")],
          ]}
        />
      </DocSection>
      <DocSection id="fields" title={k("H_FIELDS")}>
        <p>{k("P_FIELDS_1")}</p>
        <p>{k("P_FIELDS_2")}</p>
      </DocSection>
      <DocSection id="meta" title={k("H_META")}>
        <p>{k("P_META_1")}</p>
        <DocCode code={`<order 10>\n@@move_top`} />
      </DocSection>
      <DocSection id="examples" title={k("H_EXAMPLES")}>
        <p>{k("P_EXAMPLES_1")}</p>
        <DocCode
          code={`IN:  \\*(.+?)\\*
OUT: <em>$1</em>`}
        />
        <p>{k("P_EXAMPLES_2")}</p>
      </DocSection>
    </>
  );
}
