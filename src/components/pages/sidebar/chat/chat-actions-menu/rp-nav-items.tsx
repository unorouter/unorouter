import { openRpTabAtom } from "@/components/pages/sidebar/chat/rp/rp-dialogs";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import { Link } from "@/i18n/navigation";
import { useSetAtom } from "jotai";
import { useTranslations } from "next-intl";

export function RpNavItems() {
  const t = useTranslations();
  const setOpenRpTab = useSetAtom(openRpTabAtom);

  return (
    <>
      <DropdownMenuItem onClick={() => setOpenRpTab("characters")}>
        <Icon name="users" className="size-4" />
        {t("RP.SIDEBAR_TAB_CHARACTERS")}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => setOpenRpTab("personas")}>
        <Icon name="user" className="size-4" />
        {t("RP.SIDEBAR_TAB_PERSONAS")}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => setOpenRpTab("lorebooks")}>
        <Icon name="book-text" className="size-4" />
        {t("RP.SIDEBAR_TAB_LOREBOOKS")}
      </DropdownMenuItem>
      <DropdownMenuItem render={<Link href="/chat/presets" />}>
        <Icon name="sliders-horizontal" className="size-4" />
        {t("RP.SIDEBAR_TAB_PRESETS")}
      </DropdownMenuItem>
      <DropdownMenuItem render={<Link href="/chat/cards" />}>
        <Icon name="layers" className="size-4" />
        {t("RP.SIDEBAR_TAB_CARDS")}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => setOpenRpTab("custom-providers")}>
        <Icon name="server" className="size-4" />
        {t("CHAT.CUSTOM_PROVIDER.SIDEBAR_TAB")}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => setOpenRpTab("js-plugins")}>
        <Icon name="code" className="size-4" />
        {t("CHAT.JS_PLUGIN.SIDEBAR_TAB")}
      </DropdownMenuItem>
    </>
  );
}
