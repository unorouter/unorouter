"use client";

import { CharacterList } from "@/components/pages/chat/character-list";
import { LorebookList } from "@/components/pages/chat/lorebook-list";
import { PersonaList } from "@/components/pages/chat/persona-list";
import { PresetList } from "@/components/pages/chat/preset-list";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  LuBookText,
  LuSlidersHorizontal,
  LuUser,
  LuUsers,
} from "react-icons/lu";

type Tab = "characters" | "personas" | "lorebooks" | "presets";

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

export function SidebarRpNav() {
  const t = useTranslations();
  const [openTab, setOpenTab] = useState<Tab | null>(null);

  return (
    <>
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
