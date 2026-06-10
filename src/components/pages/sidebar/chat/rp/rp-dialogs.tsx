"use client";

import type { RpTab } from "@/lib/validation/rp-forms";
import { atom, useAtom } from "jotai";
import dynamic from "next/dynamic";

const CharacterList = dynamic(() =>
  import("@/components/pages/sidebar/chat/rp/character/list").then(
    (m) => m.CharacterList,
  ),
);
const PersonaList = dynamic(() =>
  import("@/components/pages/sidebar/chat/rp/persona/list").then(
    (m) => m.PersonaList,
  ),
);
const LorebookList = dynamic(() =>
  import("@/components/pages/sidebar/chat/rp/lorebook/list").then(
    (m) => m.LorebookList,
  ),
);

// Rendered at layout root so the mobile sidebar Sheet can't unmount them on close;
// dialog chunks load lazily on first open.
export const openRpTabAtom = atom<RpTab | null>(null);

export function RpDialogs() {
  const [openTab, setOpenTab] = useAtom(openRpTabAtom);
  return (
    <>
      {openTab === "characters" && (
        <CharacterList
          open
          onOpenChange={(o) => setOpenTab(o ? "characters" : null)}
        />
      )}
      {openTab === "personas" && (
        <PersonaList
          open
          onOpenChange={(o) => setOpenTab(o ? "personas" : null)}
        />
      )}
      {openTab === "lorebooks" && (
        <LorebookList
          open
          onOpenChange={(o) => setOpenTab(o ? "lorebooks" : null)}
        />
      )}
    </>
  );
}
