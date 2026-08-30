import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";
import { chatDocKey } from "../chat-doc-template";
import {
  DocImage,
  DocSection,
  DocWarning,
} from "@/components/pages/docs/doc-parts";

const P = "DOCS_CHAT.MULTIPLAYER";

export async function MultiplayerContent() {
  const t = await getTranslations();
  const k = (leaf: string) => t(chatDocKey(P, leaf), APP_VALUES);

  return (
    <>
      <DocSection id="host" title={k("H_HOST")}>
        <DocWarning>{k("P_HOST_3")}</DocWarning>
        <p>{k("P_HOST_1")}</p>
        <DocImage
          src="/images/docs/multiplayer-menu.webp"
          alt={k("IMG_MENU_ALT")}
          width={280}
          height={200}
          natural
          priority
        />
        <p>{k("P_HOST_2")}</p>
        <DocImage
          src="/images/docs/multiplayer-host-panel.webp"
          alt={k("IMG_HOST_PANEL_ALT")}
          width={280}
          height={237}
          natural
        />
      </DocSection>
      <DocSection id="guest" title={k("H_GUEST")}>
        <p>{k("P_GUEST_1")}</p>
        <DocImage
          src="/images/docs/multiplayer-join.webp"
          alt={k("IMG_JOIN_ALT")}
          width={280}
          height={150}
          natural
        />
        <p>{k("P_GUEST_2")}</p>
        <DocImage
          src="/images/docs/multiplayer-guest-view.webp"
          alt={k("IMG_GUEST_VIEW_ALT")}
          width={495}
          height={280}
          natural
        />
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
