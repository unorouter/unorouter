import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";
import { chatDocKey } from "../chat-doc-template";
import {
  DocCode,
  DocKbd,
  DocSection,
  DocTable,
} from "@/components/pages/docs/doc-parts";

const P = "DOCS_CHAT.MACROS";

export async function MacrosContent() {
  const t = await getTranslations();
  const k = (leaf: string) => t(chatDocKey(P, leaf), APP_VALUES);

  return (
    <>
      <DocSection id="syntax" title={k("H_SYNTAX")}>
        <p>{k("P_SYNTAX_1")}</p>
        <DocCode
          code={`{{char}} smiles at {{user}}.
{{random::sunny::rainy::foggy}}
{{calc::1+2*3}}`}
        />
        <p>{k("P_SYNTAX_2")}</p>
      </DocSection>
      <DocSection id="core" title={k("H_CORE")}>
        <DocTable
          headers={[k("TH_MACRO"), k("TH_RESULT")]}
          rows={[
            [<DocKbd key="m">{"{{char}}"}</DocKbd>, k("M_CHAR")],
            [<DocKbd key="m">{"{{user}}"}</DocKbd>, k("M_USER")],
            [<DocKbd key="m">{"{{persona}}"}</DocKbd>, k("M_PERSONA")],
            [<DocKbd key="m">{"{{description}}"}</DocKbd>, k("M_DESCRIPTION")],
            [<DocKbd key="m">{"{{lastmessage}}"}</DocKbd>, k("M_LASTMESSAGE")],
            [<DocKbd key="m">{"{{time}} / {{date}}"}</DocKbd>, k("M_TIME")],
          ]}
        />
      </DocSection>
      <DocSection id="random" title={k("H_RANDOM")}>
        <p>{k("P_RANDOM_1")}</p>
        <DocCode
          code={`{{random::a::b::c}}   {{pick::a::b::c}}   {{roll::d20}}`}
        />
        <p>{k("P_RANDOM_2")}</p>
      </DocSection>
      <DocSection id="vars" title={k("H_VARS")}>
        <p>{k("P_VARS_1")}</p>
        <DocCode
          code={`{{setvar::mood::happy}}
{{getvar::mood}}
{{setglobalvar::visits::1}}`}
        />
        <p>{k("P_VARS_2")}</p>
      </DocSection>
      <DocSection id="blocks" title={k("H_BLOCKS")}>
        <p>{k("P_BLOCKS_1")}</p>
        <DocCode
          code={`{{#if {{equal::{{getvar::mood}}::happy}}}}
{{char}} is in a great mood.
{{/if}}

{{#each {{array::red::green::blue}} item}}
Color: {{slot::item}}
{{/each}}`}
        />
        <p>{k("P_BLOCKS_2")}</p>
      </DocSection>
      <DocSection id="comments" title={k("H_COMMENTS")}>
        <p>{k("P_COMMENTS_1")}</p>
        <DocCode
          code={`{{// note to self, never sent to the model}}
{{#pure}}{{char}} stays literal here{{/pure}}`}
        />
      </DocSection>
    </>
  );
}
