import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";
import { chatDocKey } from "../chat-doc-template";
import { DocCode, DocKbd, DocSection } from "../chat-doc-parts";

const P = "DOCS_CHAT.TRIGGERS_AND_LUA";

export async function TriggersAndLuaContent() {
  const t = await getTranslations();
  const k = (leaf: string) => t(chatDocKey(P, leaf), APP_VALUES);

  return (
    <>
      <DocSection id="triggers" title={k("H_TRIGGERS")}>
        <p>{k("P_TRIGGERS_1")}</p>
        <p>{k("P_TRIGGERS_2")}</p>
      </DocSection>
      <DocSection id="effects" title={k("H_EFFECTS")}>
        <p>{k("P_EFFECTS_1")}</p>
        <p>
          <DocKbd>runLLM</DocKbd> <DocKbd>checkSimilarity</DocKbd>{" "}
          <DocKbd>extractRegex</DocKbd> <DocKbd>runImgGen</DocKbd>{" "}
          <DocKbd>showAlert</DocKbd> <DocKbd>sendAIprompt</DocKbd>{" "}
          <DocKbd>triggerlua</DocKbd>
        </p>
        <p>{k("P_EFFECTS_2")}</p>
      </DocSection>
      <DocSection id="lua" title={k("H_LUA")}>
        <p>{k("P_LUA_1")}</p>
        <DocCode
          lang="lua"
          code={`onOutput = async(function(triggerId)
  local msg = getChat(triggerId, -1)
  if string.find(msg.data, "secret") then
    alertNormal(triggerId, "Secret mentioned!")
  end
end)
listenEdit("editoutput", function(triggerId, data)
  return data:gsub("%s+$", "")
end)`}
        />
      </DocSection>
      <DocSection id="hooks" title={k("H_HOOKS")}>
        <p>{k("P_HOOKS_1")}</p>
        <p>{k("P_HOOKS_2")}</p>
      </DocSection>
      <DocSection id="safety" title={k("H_SAFETY")}>
        <p>{k("P_SAFETY_1")}</p>
      </DocSection>
    </>
  );
}
