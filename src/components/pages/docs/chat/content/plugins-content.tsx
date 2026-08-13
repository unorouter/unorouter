import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";
import { chatDocKey } from "../chat-doc-template";
import { DocCode, DocKbd, DocSection } from "@/components/pages/docs/doc-parts";

const P = "DOCS_CHAT.PLUGINS";

export async function PluginsContent() {
  const t = await getTranslations();
  const k = (leaf: string) => t(chatDocKey(P, leaf), APP_VALUES);

  return (
    <>
      <DocSection id="overview" title={k("H_OVERVIEW")}>
        <p>{k("P_OVERVIEW_1")}</p>
        <p>{k("P_OVERVIEW_2")}</p>
      </DocSection>

      <DocSection id="hooks" title={k("H_HOOKS")}>
        <p>{k("P_HOOKS_1")}</p>
        <p>
          <DocKbd>input</DocKbd> <DocKbd>request</DocKbd>{" "}
          <DocKbd>output</DocKbd> <DocKbd>display</DocKbd>
        </p>
        <p>{k("P_HOOKS_2")}</p>
        <DocCode
          code={`uno.registerHandler("output", (text) => {\n  return text.replace(/\\bcolour\\b/g, "color");\n});`}
        />
        <p>{k("P_HOOKS_3")}</p>
      </DocSection>

      <DocSection id="api" title={k("H_API")}>
        <p>{k("P_API_1")}</p>
        <DocCode
          code={`const name = await uno.getName();\nconst last = await uno.getUserLastMessage();\nawait uno.setChatVar("mood", "curious");\nconst mood = await uno.getChatVar("mood");`}
        />
        <p>{k("P_API_2")}</p>
      </DocSection>

      <DocSection id="janitor" title={k("H_JANITOR")}>
        <p>{k("P_JANITOR_1")}</p>
        <DocCode
          code={`if (context.chat.last_message.toLowerCase().indexOf("storm") !== -1) {\n  context.character.scenario += "\\nA storm is rolling in.";\n}`}
        />
        <p>{k("P_JANITOR_2")}</p>
      </DocSection>

      <DocSection id="safety" title={k("H_SAFETY")}>
        <p>{k("P_SAFETY_1")}</p>
        <p>{k("P_SAFETY_2")}</p>
      </DocSection>
    </>
  );
}
