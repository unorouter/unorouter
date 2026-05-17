"use client";

import { CharacterList } from "@/components/pages/sidebar/chat/rp/character-list";
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
import {
  LuBookText,
  LuLayers,
  LuSlidersHorizontal,
  LuUser,
  LuUsers,
} from "react-icons/lu";

type Tab = "characters" | "personas" | "lorebooks";

/**
 * Open RP dialog tab. Lifted to a jotai atom so the dialogs (rendered at the
 * layout root via <RpDialogs />) survive the mobile sidebar Sheet unmount
 * when the user taps a tab. Without this, opening a Sheet-nested dialog
 * while closing the Sheet would unmount the dialog before it ever paints.
 */
const openRpTabAtom = atom<Tab | null>(null);

const items: Array<{
  tab: Tab;
  labelKey:
    | "RP.SIDEBAR_TAB_CHARACTERS"
    | "RP.SIDEBAR_TAB_PERSONAS"
    | "RP.SIDEBAR_TAB_LOREBOOKS";
  Icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    tab: "characters",
    labelKey: "RP.SIDEBAR_TAB_CHARACTERS",
    Icon: LuUsers,
  },
  {
    tab: "personas",
    labelKey: "RP.SIDEBAR_TAB_PERSONAS",
    Icon: LuUser,
  },
  {
    tab: "lorebooks",
    labelKey: "RP.SIDEBAR_TAB_LOREBOOKS",
    Icon: LuBookText,
  },
];

/** Trigger row rendered inside the sidebar. */
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
                <it.Icon className="size-4" />
              </Button>
            }
          />
          <TooltipContent side="bottom">{t(it.labelKey)}</TooltipContent>
        </Tooltip>
      ))}
      {/* Presets + cards have their own pages now (more room for prompt + flag
          editing). Sidebar icons navigate instead of opening a dialog. */}
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
              <LuSlidersHorizontal className="size-4" />
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
              <LuLayers className="size-4" />
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

/**
 * Dialog host. Rendered at the layout root so the dialogs are not nested
 * inside the mobile sidebar Sheet (which would unmount them on close).
 */
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
