"use client";

import { CharacterList } from "@/components/pages/sidebar/chat/rp/character-list";
import { LorebookList } from "@/components/pages/sidebar/chat/rp/lorebook-list";
import { PersonaList } from "@/components/pages/sidebar/chat/rp/persona-list";
import { atom, useAtom } from "jotai";

export type RpTab = "characters" | "personas" | "lorebooks";

// Dialogs render at layout root so they aren't nested inside the mobile
// sidebar Sheet (which would unmount them on close).
export const openRpTabAtom = atom<RpTab | null>(null);

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
