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
const CustomProviderList = dynamic(() =>
  import("@/components/pages/sidebar/chat/rp/custom-provider/list").then(
    (m) => m.CustomProviderList,
  ),
);
const RoomHostPanel = dynamic(() =>
  import("@/components/pages/room/room-host-panel").then((m) => m.RoomHostPanel),
);
const JsPluginList = dynamic(() =>
  import("@/components/pages/sidebar/chat/rp/js-plugin/list").then(
    (m) => m.JsPluginList,
  ),
);

export const openRpTabAtom = atom<RpTab | null>(null);
export const roomPanelOpenAtom = atom(false);

export function RpDialogs() {
  const [openTab, setOpenTab] = useAtom(openRpTabAtom);
  const [roomOpen, setRoomOpen] = useAtom(roomPanelOpenAtom);
  return (
    <>
      {roomOpen && <RoomHostPanel open onOpenChange={setRoomOpen} />}
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
      {openTab === "custom-providers" && (
        <CustomProviderList
          open
          onOpenChange={(o) => setOpenTab(o ? "custom-providers" : null)}
        />
      )}
      {openTab === "js-plugins" && (
        <JsPluginList
          open
          onOpenChange={(o) => setOpenTab(o ? "js-plugins" : null)}
        />
      )}
    </>
  );
}
