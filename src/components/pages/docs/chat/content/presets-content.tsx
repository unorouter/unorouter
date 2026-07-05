import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";
import { chatDocKey } from "../chat-doc-template";
import { DocKbd, DocSection, DocTable } from "@/components/pages/docs/doc-parts";

const P = "DOCS_CHAT.PRESETS";

export async function PresetsContent() {
  const t = await getTranslations();
  const k = (leaf: string) => t(chatDocKey(P, leaf), APP_VALUES);

  return (
    <>
      <DocSection id="sampling" title={k("H_SAMPLING")}>
        <p>{k("P_SAMPLING_1")}</p>
        <p>{k("P_SAMPLING_2")}</p>
      </DocSection>
      <DocSection id="behavior" title={k("H_BEHAVIOR")}>
        <p>{k("P_BEHAVIOR_1")}</p>
        <DocTable
          headers={[k("TH_TOGGLE"), k("TH_EFFECT")]}
          rows={[
            [<DocKbd key="b">noSystemRole</DocKbd>, k("B_NO_SYSTEM_ROLE")],
            [
              <DocKbd key="b">forceAlternateRoles</DocKbd>,
              k("B_FORCE_ALTERNATE"),
            ],
            [
              <DocKbd key="b">mustStartWithUserInput</DocKbd>,
              k("B_USER_FIRST"),
            ],
            [<DocKbd key="b">geminiBlockOff</DocKbd>, k("B_GEMINI_BLOCK_OFF")],
            [<DocKbd key="b">streamingEnabled</DocKbd>, k("B_STREAMING")],
            [<DocKbd key="b">showReasoning</DocKbd>, k("B_SHOW_REASONING")],
          ]}
        />
      </DocSection>
      <DocSection id="prompts" title={k("H_PROMPTS")}>
        <p>{k("P_PROMPTS_1")}</p>
        <p>{k("P_PROMPTS_2")}</p>
        <p>{k("P_PROMPTS_3")}</p>
      </DocSection>
      <DocSection id="default" title={k("H_DEFAULT")}>
        <p>{k("P_DEFAULT_1")}</p>
      </DocSection>
    </>
  );
}
