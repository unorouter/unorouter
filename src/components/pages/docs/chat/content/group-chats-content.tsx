import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";
import { chatDocKey } from "../chat-doc-template";
import { DocSection } from "@/components/pages/docs/doc-parts";

const P = "DOCS_CHAT.GROUP_CHATS";

export async function GroupChatsContent() {
  const t = await getTranslations();
  const k = (leaf: string) => t(chatDocKey(P, leaf), APP_VALUES);

  return (
    <>
      <DocSection id="setup" title={k("H_SETUP")}>
        <p>{k("P_SETUP_1")}</p>
      </DocSection>
      <DocSection id="rotation" title={k("H_ROTATION")}>
        <p>{k("P_ROTATION_1")}</p>
        <p>{k("P_ROTATION_2")}</p>
      </DocSection>
      <DocSection id="gating" title={k("H_GATING")}>
        <p>{k("P_GATING_1")}</p>
        <p>{k("P_GATING_2")}</p>
      </DocSection>
      <DocSection id="tips" title={k("H_TIPS")}>
        <p>{k("P_TIPS_1")}</p>
      </DocSection>
    </>
  );
}
