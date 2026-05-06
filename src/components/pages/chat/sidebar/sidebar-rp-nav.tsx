"use client";

import { CharacterList } from "@/components/pages/chat/rp/character-list";
import { LorebookList } from "@/components/pages/chat/rp/lorebook-list";
import { PersonaList } from "@/components/pages/chat/rp/persona-list";
import { PresetList } from "@/components/pages/chat/rp/preset-list";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { atom, useAtom } from "jotai";
import { useTranslations } from "next-intl";
import {
  LuBookText,
  LuSlidersHorizontal,
  LuUser,
  LuUsers,
} from "react-icons/lu";

type Tab = "characters" | "personas" | "lorebooks" | "presets";

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
    | "RP.SIDEBAR_TAB_LOREBOOKS"
    | "RP.SIDEBAR_TAB_PRESETS";
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
  {
    tab: "presets",
    labelKey: "RP.SIDEBAR_TAB_PRESETS",
    Icon: LuSlidersHorizontal,
  },
];

/** Trigger row rendered inside the sidebar. */
export function SidebarRpNav() {
  const t = useTranslations();
  const [, setOpenTab] = useAtom(openRpTabAtom);

  return (
    <div className="flex items-center gap-1 px-2 py-1">
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
    </div>
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
      <PresetList
        open={openTab === "presets"}
        onOpenChange={(o) => setOpenTab(o ? "presets" : null)}
      />
    </>
  );
}
