import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";
import { chatDocKey } from "../chat-doc-template";
import {
  DocAppLink,
  DocImage,
  DocSection,
  DocTable,
  DocWarning,
} from "@/components/pages/docs/doc-parts";

const P = "DOCS_CHAT.THEME";

export async function ThemeContent() {
  const t = await getTranslations();
  const k = (leaf: string) => t(chatDocKey(P, leaf), APP_VALUES);

  return (
    <>
      <DocSection id="open" title={k("H_OPEN")}>
        <p>{k("P_OPEN_1")}</p>
        <p>{k("P_OPEN_2")}</p>
      </DocSection>

      <DocSection id="scopes" title={k("H_SCOPES")}>
        <p>{k("P_SCOPES_1")}</p>
        <DocImage
          src="/images/docs/theme-scopes.webp"
          alt={k("IMG_SCOPES_ALT")}
          width={296}
          height={447}
          natural
          priority
        />
        <DocTable
          headers={[k("TH_TAB"), k("TH_MEANING")]}
          rows={[
            [t("THEME.SCOPE_APP"), k("SC_APP_D")],
            [t("THEME.SCOPE_CHAT"), k("SC_CHAT_D")],
            [t("THEME.SCOPE_IMAGE"), k("SC_IMAGE_D")],
          ]}
        />
        <p>{k("P_SCOPES_2")}</p>
      </DocSection>

      <DocSection id="opacity" title={k("H_OPACITY")}>
        <p>{k("P_OPACITY_1")}</p>
        <DocImage
          src="/images/docs/theme-color-opacity.webp"
          alt={k("IMG_OPACITY_ALT")}
          width={253}
          height={90}
          natural
        />
        <p>{k("P_OPACITY_2")}</p>
        <DocTable
          headers={[k("TH_PART"), k("TH_WHERE"), k("TH_NOTE")]}
          rows={[
            [t("THEME.TOKEN.BACKGROUND"), t("THEME.CATEGORY.COLORS"), ""],
            [t("THEME.TOKEN.SIDEBAR"), t("THEME.CATEGORY.COLORS"), ""],
            [t("THEME.REGION.HEADER"), t("THEME.CATEGORY.WALLPAPER"), ""],
            [
              t("THEME.REGION.OVERLAY"),
              t("THEME.CATEGORY.WALLPAPER"),
              k("N_SHEETS"),
            ],
            [
              t("THEME.TOKEN.POPOVER"),
              t("THEME.CATEGORY.COLORS"),
              k("N_MENUS"),
            ],
            [
              t("THEME.REGION.COMPOSER"),
              t("THEME.CATEGORY.CHAT_SURFACES"),
              "",
            ],
            [
              `${t("THEME.REGION.BUBBLE_USER")}, ${t("THEME.REGION.BUBBLE_ASSISTANT")}`,
              t("THEME.CATEGORY.CHAT_SURFACES"),
              k("N_BUBBLES"),
            ],
            [k("PA_EDITOR"), "", k("N_EDITOR")],
          ]}
        />
        <DocImage
          src="/images/docs/theme-chat-surfaces.webp"
          alt={k("IMG_CHAT_ALT")}
          width={257}
          height={361}
          natural
        />
        <DocWarning>{k("P_OPACITY_3")}</DocWarning>
      </DocSection>

      <DocSection id="wallpaper" title={k("H_WALLPAPER")}>
        <p>{k("P_WALLPAPER_1")}</p>
        <DocImage
          src="/images/docs/theme-background.webp"
          alt={k("IMG_BG_ALT")}
          width={257}
          height={442}
          natural
        />
        <p>{k("P_WALLPAPER_2")}</p>
      </DocSection>

      <DocSection id="saved" title={k("H_SAVED")}>
        <p>{k("P_SAVED_1")}</p>
        <p>{k("P_SAVED_2")}</p>
        <p>
          {k("P_SAVED_3")}{" "}
          <DocAppLink
            href={{
              pathname: "/docs/chat/[slug]",
              params: { slug: "backups" },
            }}
          >
            {t("DOCS_CHAT.BACKUPS.TITLE")}
          </DocAppLink>
        </p>
      </DocSection>

      <DocSection id="troubleshoot" title={k("H_TROUBLESHOOT")}>
        <DocTable
          headers={[k("TH_SYMPTOM"), k("TH_FIX")]}
          rows={[
            [k("X_SYM_CLEAR"), k("X_FIX_CLEAR")],
            [k("X_SYM_SLIDER"), k("X_FIX_SLIDER")],
            [k("X_SYM_CHAT"), k("X_FIX_CHAT")],
            [k("X_SYM_LOST"), k("X_FIX_LOST")],
          ]}
        />
      </DocSection>
    </>
  );
}
