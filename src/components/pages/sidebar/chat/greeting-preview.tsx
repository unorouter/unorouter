"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useCharactersQuery } from "@/hooks/ai/rp/characters";
import { useLorebooksQuery } from "@/hooks/ai/rp/lorebooks";
import { useMediaSrc } from "@/hooks/ai/use-media-src";
import { usePersonaQuery } from "@/hooks/ai/rp/personas";
import { IMG_TOKEN_RE } from "@/lib/db/client/data/media/img-render";
import { resolveGreetingSource } from "@/lib/ai/chat/greeting-source";
import { expandMacros } from "@/lib/ai/chat/macros";
import { analytics } from "@/lib/analytics";
import { chatLoadoutAtom, greetingIndexAtom } from "@/store/chat-store";
import { useAtom, useAtomValue } from "jotai";

export function GreetingPreview() {
  const loadout = useAtomValue(chatLoadoutAtom);
  const [index, setIndex] = useAtom(greetingIndexAtom);
  const charactersQuery = useCharactersQuery();
  const personaQuery = usePersonaQuery(loadout.personaId ?? undefined);
  const lorebooksQuery = useLorebooksQuery();

  const char =
    charactersQuery.data?.find((c) => c.id === loadout.characterIds[0]) ?? null;
  const books = loadout.lorebookIds.flatMap((id) => {
    const book = lorebooksQuery.data?.find((b) => b.id === id);
    return book ? [book] : [];
  });
  const source = resolveGreetingSource({
    character: char,
    lorebooks: books,
    persona: personaQuery.data ?? null,
  });
  if (!source) return null;

  const greetings = source.greetings;
  const safeIndex = Math.min(index, greetings.length - 1);
  const text = expandMacros(greetings[safeIndex], source.scope);

  const assets = source.characterId ? (char?.assets ?? []) : [];

  return (
    <div className="bg-muted/40 w-full max-w-(--thread-max-width) rounded-2xl border px-4 py-3">
      <p className="text-sm whitespace-pre-wrap">
        <GreetingBody text={text} assets={assets} />
      </p>
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

function GreetingBody(props: {
  text: string;
  assets: { name: string; mediaId: string }[];
}) {
  const segments = props.text.split(IMG_TOKEN_RE);
  // split with one capture group yields [text, name, text, name, ...]
  return (
    <>
      {segments.map((seg, i) => {
        if (i % 2 === 0) return <span key={i}>{seg}</span>;
        const asset = props.assets.find(
          (a) => a.name.trim().toLowerCase() === seg.trim().toLowerCase(),
        );
        if (!asset) return null;
        return <GreetingImg key={i} mediaId={asset.mediaId} name={seg} />;
      })}
    </>
  );
}

function GreetingImg(props: { mediaId: string; name: string }) {
  const src = useMediaSrc(props.mediaId);
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={props.name}
      style={{ maxWidth: "min(100%, var(--asset-img-max-width, 100%))" }}
      className="my-1 block rounded-lg"
    />
  );
}
