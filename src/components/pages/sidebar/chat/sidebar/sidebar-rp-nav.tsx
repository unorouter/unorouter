"use client";

import { CharacterList } from "@/components/pages/sidebar/chat/rp/character-list";
import { Icon } from "@/components/ui/icon";
import { LorebookList } from "@/components/pages/sidebar/chat/rp/lorebook-list";
import { PersonaList } from "@/components/pages/sidebar/chat/rp/persona-list";
import { Button } from "@/components/ui/button";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Link } from "@/i18n/navigation";
import { atom, useAtom } from "jotai";
import { useTranslations } from "next-intl";
import type { IconName } from "@/lib/config/icon-map";

type Tab = "characters" | "personas" | "lorebooks";

// Atom lifted out so dialogs (rendered at layout root via <RpDialogs />)
// survive mobile sidebar Sheet unmount on tab tap.
const openRpTabAtom = atom<Tab | null>(null);

const items: Array<{
  tab: Tab;
  labelKey:
    | "RP.SIDEBAR_TAB_CHARACTERS"
    | "RP.SIDEBAR_TAB_PERSONAS"
    | "RP.SIDEBAR_TAB_LOREBOOKS";
  iconName: IconName;
}> = [
  {
    tab: "characters",
    labelKey: "RP.SIDEBAR_TAB_CHARACTERS",
    iconName: "users",
  },
  {
    tab: "personas",
    labelKey: "RP.SIDEBAR_TAB_PERSONAS",
    iconName: "user",
  },
  {
    tab: "lorebooks",
    labelKey: "RP.SIDEBAR_TAB_LOREBOOKS",
    iconName: "book-text",
  },
];

export function SidebarRpNav() {
  const t = useTranslations();
  const [, setOpenTab] = useAtom(openRpTabAtom);

  return (
    <SidebarGroup className="shrink-0 group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>{t("RP.SIDEBAR_GROUP_LABEL")}</SidebarGroupLabel>
      <SidebarGroupContent className="flex items-center gap-1">
        {items.map((it) => (
          <Tooltip key={it.tab}>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t(it.labelKey)}
                  onClick={() => setOpenTab(it.tab)}
                >
                  <Icon name={it.iconName} className="size-4" />
                </Button>
              }
            />
            <TooltipContent side="bottom">{t(it.labelKey)}</TooltipContent>
          </Tooltip>
        ))}
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("RP.SIDEBAR_TAB_PRESETS")}
                nativeButton={false}
                render={<Link href="/chat/presets" />}
              >
                <Icon name="sliders-horizontal" className="size-4" />
              </Button>
            }
          />
          <TooltipContent side="bottom">
            {t("RP.SIDEBAR_TAB_PRESETS")}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("RP.SIDEBAR_TAB_CARDS")}
                nativeButton={false}
                render={<Link href="/chat/cards" />}
              >
                <Icon name="layers" className="size-4" />
              </Button>
            }
          />
          <TooltipContent side="bottom">
            {t("RP.SIDEBAR_TAB_CARDS")}
          </TooltipContent>
        </Tooltip>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

// Rendered at layout root so dialogs aren't nested inside the mobile sidebar
// Sheet (which would unmount them on close).
export function RpDialogs() {
  const [openTab, setOpenTab] = useAtom(openRpTabAtom);
  return (
    <>
      <CharacterList
        open={openTab === "characters"}
        onOpenChange={(o) => setOpenTab(o ? "characters" : null)}
      />
      <PersonaList
        open={openTab === "personas"}
        onOpenChange={(o) => setOpenTab(o ? "personas" : null)}
      />
      <LorebookList
        open={openTab === "lorebooks"}
        onOpenChange={(o) => setOpenTab(o ? "lorebooks" : null)}
      />
    </>
  );
}
