import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";
import { chatDocKey } from "../chat-doc-template";
import { DocSection } from "@/components/pages/docs/doc-parts";

const P = "DOCS_CHAT.MULTIPLAYER";

export async function MultiplayerContent() {
  const t = await getTranslations();
  const k = (leaf: string) => t(chatDocKey(P, leaf), APP_VALUES);

  return (
    <>
      <DocSection id="host" title={k("H_HOST")}>
        <p>{k("P_HOST_1")}</p>
        <p>{k("P_HOST_2")}</p>
        <p>{k("P_HOST_3")}</p>
      </DocSection>
      <DocSection id="guest" title={k("H_GUEST")}>
        <p>{k("P_GUEST_1")}</p>
        <p>{k("P_GUEST_2")}</p>
      </DocSection>
      <DocSection id="turns" title={k("H_TURNS")}>
        <p>{k("P_TURNS_1")}</p>
        <p>{k("P_TURNS_2")}</p>
      </DocSection>
      <DocSection id="limits" title={k("H_LIMITS")}>
        <p>{k("P_LIMITS_1")}</p>
        <p>{k("P_LIMITS_2")}</p>
        <p>{k("P_LIMITS_3")}</p>
      </DocSection>
      <DocSection id="troubleshooting" title={k("H_TROUBLESHOOTING")}>
        <p>{k("P_TROUBLESHOOTING_1")}</p>
        <p>{k("P_TROUBLESHOOTING_2")}</p>
      </DocSection>
    </>
  );
}
