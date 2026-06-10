"use client";

import { useCharacterQuery } from "@/hooks/ai/rp/characters";
import { useChatBindingsQuery } from "@/hooks/ai/rp/conversations";
import { useMediaSrc } from "@/hooks/ai/use-media-src";

// Primary character's background painted behind the thread, RisuAI style. Parent
// must be `relative isolate` so the -z-10 layers stay inside it.
export function CharacterBackground(props: { convId?: string }) {
  const bindings = useChatBindingsQuery(props.convId);
  const primary = (bindings.data?.characters ?? [])
    .filter((c) => c.isActive)
    .sort((a, b) => a.orderIndex - b.orderIndex)[0];
  const character = useCharacterQuery(primary?.characterId);
  const src = useMediaSrc(character.data?.backgroundMediaId);
  if (!src) return null;
  return (
    <>
      <div
        className="absolute inset-0 -z-10 bg-cover bg-center"
        style={{ backgroundImage: `url(${src})` }}
      />
      {/* Readability scrim; thread bg goes transparent so the image shows. */}
      <div className="bg-background/55 absolute inset-0 -z-10" />
      <style>{".aui-thread-root{background-color:transparent}"}</style>
    </>
  );
}
