"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useCharactersQuery } from "@/hooks/ai/rp/characters";
import { usePersonaQuery } from "@/hooks/ai/rp/personas";
import { expandMacros } from "@/lib/ai/chat/macros";
import { analytics } from "@/lib/analytics";
import { chatLoadoutAtom, greetingIndexAtom } from "@/store/chat-store";
import { useAtom, useAtomValue } from "jotai";

export function GreetingPreview() {
  const loadout = useAtomValue(chatLoadoutAtom);
  const [index, setIndex] = useAtom(greetingIndexAtom);
  const charactersQuery = useCharactersQuery();
  const personaQuery = usePersonaQuery(loadout.personaId ?? undefined);

  const char = charactersQuery.data?.find(
    (c) => c.id === loadout.characterIds[0],
  );
  if (!char?.firstMessage) return null;

  const greetings = [char.firstMessage, ...(char.alternateGreetings ?? [])];
  const safeIndex = Math.min(index, greetings.length - 1);
  const text = expandMacros(greetings[safeIndex], {
    user: personaQuery.data?.name ?? "User",
    char: char.name,
    user_description: personaQuery.data?.description ?? "",
    char_description: char.description ?? "",
    scenario: char.scenario ?? "",
    personality: char.personality ?? "",
    vars: {},
  });

  return (
    <div className="bg-muted/40 w-full max-w-(--thread-max-width) rounded-2xl border px-4 py-3">
      <p className="text-sm whitespace-pre-wrap">{text}</p>
      {greetings.length > 1 && (
        <div className="text-muted-foreground mt-2 flex items-center justify-end gap-1 text-xs">
          <Button
            variant="ghost"
            size="icon-xs"
            disabled={safeIndex === 0}
            onClick={() => {
              analytics.chat.greetingPicked({ index: safeIndex - 1 });
              setIndex(safeIndex - 1);
            }}
          >
            <Icon name="chevron-left" className="size-3.5" />
          </Button>
          <span className="font-mono tabular-nums">
            {safeIndex + 1} / {greetings.length}
          </span>
          <Button
            variant="ghost"
            size="icon-xs"
            disabled={safeIndex === greetings.length - 1}
            onClick={() => {
              analytics.chat.greetingPicked({ index: safeIndex + 1 });
              setIndex(safeIndex + 1);
            }}
          >
            <Icon name="chevron-right" className="size-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
