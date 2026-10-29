"use client";

import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxClear,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
} from "@/components/ui/combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCardsQuery } from "@/hooks/ai/rp/cards";
import { useCharactersQuery } from "@/hooks/ai/rp/characters";
import { useLorebooksQuery } from "@/hooks/ai/rp/lorebooks";
import { usePersonasQuery } from "@/hooks/ai/rp/personas";
import { usePresetsQuery } from "@/hooks/ai/rp/presets";
import { useMediaFocal, useMediaSrc } from "@/hooks/ai/use-media-src";
import { readLocalCard } from "@/lib/db/client/data/rp/rp";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { NONE_VALUE } from "@/lib/config/constants";
import { RpAvatar } from "./rp/shared/rp-list-parts";
import type { NamedEntity } from "@/lib/types";
import { chatLoadoutAtom, type ChatLoadout } from "@/store/chat-store";
import { useAtom } from "jotai";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

const entityLabel = (o: NamedEntity) => o.title || o.name;

function EntityPicker(props: {
  label: string;
  noneLabel: string;
  value: string | null;
  options: NamedEntity[] | undefined;
  onChange: (id: string | null) => void;
}) {
  const options = props.options ?? [];
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-muted-foreground text-xs">{props.label}</span>
      <Select
        value={props.value ?? NONE_VALUE}
        onValueChange={(v) => props.onChange(v === NONE_VALUE ? null : v)}
      >
        <SelectTrigger className="h-8 w-full min-w-0">
          <SelectValue className="min-w-0">
            {(value: string) => {
              const match = options.find((o) => o.id === value);
              return (
                <span className="truncate">
                  {match ? entityLabel(match) : props.noneLabel}
                </span>
              );
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE_VALUE}>{props.noneLabel}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              <span className="flex min-w-0 items-center gap-2">
                <RpAvatar
                  mediaId={o.avatarMediaId}
                  name={o.name}
                  className="size-5"
                />
                <span className="truncate">{entityLabel(o)}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function MultiPicker(props: {
  label: string;
  searchPlaceholder: string;
  emptyText: string;
  value: string[];
  options: NamedEntity[] | undefined;
  onChange: (ids: string[]) => void;
}) {
  const options = props.options ?? [];
  const lookup = new Map(options.map((o) => [o.id, o]));
  return (
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground text-xs">{props.label}</span>
      <Combobox
        items={options.map((o) => o.id)}
        multiple
        value={props.value}
        onValueChange={(next) => props.onChange(next)}
        itemToStringLabel={(id) => lookup.get(id)?.name ?? id}
      >
        <ComboboxChips>
          <ComboboxValue>
            {(value: string[]) =>
              value.map((id) => (
                <ComboboxChip key={id} aria-label={lookup.get(id)?.name}>
                  {lookup.get(id)?.name ?? id}
                </ComboboxChip>
              ))
            }
          </ComboboxValue>
          <ComboboxChipsInput placeholder={props.searchPlaceholder} />
          <ComboboxClear />
        </ComboboxChips>
        <ComboboxContent>
          <ComboboxEmpty>{props.emptyText}</ComboboxEmpty>
          <ComboboxList>
            {(id: string) => (
              <ComboboxItem key={id} value={id}>
                <span className="flex min-w-0 items-center gap-2">
                  <RpAvatar
                    mediaId={lookup.get(id)?.avatarMediaId}
                    name={lookup.get(id)?.name ?? id}
                    className="size-5"
                  />
                  <span className="truncate">{lookup.get(id)?.name ?? id}</span>
                </span>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}

type GalleryCharacter = NonNullable<
  ReturnType<typeof useCharactersQuery>["data"]
>[number];

function GalleryTile(props: {
  character: GalleryCharacter;
  selected: boolean;
  onToggle: () => void;
}) {
  const src = useMediaSrc(props.character.avatarMediaId);
  const objectPosition = useMediaFocal(props.character.avatarMediaId);
  return (
    <button
      type="button"
      onClick={props.onToggle}
      aria-pressed={props.selected}
      className={cn(
        "bg-muted/40 hover:bg-muted relative flex w-28 shrink-0 snap-start flex-col overflow-hidden rounded-md border text-left transition-colors",
        props.selected && "border-primary ring-primary ring-2",
      )}
    >
      <div className="bg-muted relative aspect-[3/4] w-full">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- local blob URL, next/image cannot optimize it
          <img
            src={src}
            alt={props.character.name}
            className="absolute inset-0 size-full object-cover"
            style={{ objectPosition }}
          />
        ) : (
          <span className="text-muted-foreground absolute inset-0 flex items-center justify-center text-3xl font-medium">
            {props.character.name[0]?.toUpperCase() ?? "?"}
          </span>
        )}
        {props.selected && (
          <span className="bg-primary text-primary-foreground absolute top-1 right-1 rounded-full p-0.5">
            <Icon name="check" className="size-3" />
          </span>
        )}
      </div>
      <div className="flex flex-col gap-0.5 p-1.5">
        <span className="truncate text-xs font-medium">
          {props.character.name}
        </span>
        {props.character.description && (
          <span className="text-muted-foreground line-clamp-2 text-[10px] leading-tight">
            {props.character.description}
          </span>
        )}
      </div>
    </button>
  );
}

function CharacterGallery(props: {
  characters: GalleryCharacter[];
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const sorted = [...props.characters].sort(
    (a, b) =>
      Number(b.isFavorite) - Number(a.isFavorite) ||
      b.updatedAt.getTime() - a.updatedAt.getTime(),
  );
  return (
    // inline-size containment keeps the tiles from widening the whole thread.
    <div className="-mx-3 flex snap-x gap-2 overflow-x-auto px-3 pb-1 [contain:inline-size]">
      {sorted.map((c) => {
        const selected = props.value.includes(c.id);
        return (
          <GalleryTile
            key={c.id}
            character={c}
            selected={selected}
            onToggle={() =>
              props.onChange(
                selected
                  ? props.value.filter((id) => id !== c.id)
                  : [...props.value, c.id],
              )
            }
          />
        );
      })}
    </div>
  );
}

export function ChatLoadout() {
  const t = useTranslations();
  const [loadout, setLoadout] = useAtom(chatLoadoutAtom);
  const presets = usePresetsQuery().data;
  const personas = usePersonasQuery().data;
  const characters = useCharactersQuery().data;
  const lorebooks = useLorebooksQuery().data;
  const cards = useCardsQuery().data;

  const patch = (next: Partial<ChatLoadout>) =>
    setLoadout({ ...loadout, ...next });

  // Patches the LOADOUT, never the apply mutation: no conversation exists yet.
  const applyCard = async (cardId: string | null) => {
    if (!cardId) {
      patch({ personaId: null, characterIds: [], lorebookIds: [] });
      return;
    }
    const card = await readLocalCard(cardId);
    if (!card) return;
    patch({
      personaId: card.personaId ?? null,
      characterIds: card.cardCharacters.map((c) => c.characterId),
      lorebookIds: card.cardLorebooks.map((l) => l.lorebookId),
    });
    toast.success(t("RP.CARDS_APPLIED"));
  };

  const hasNothing =
    (presets?.length ?? 0) === 0 &&
    (personas?.length ?? 0) === 0 &&
    (characters?.length ?? 0) === 0 &&
    (lorebooks?.length ?? 0) === 0;
  if (hasNothing) return null;

  return (
    <div className="border-border/60 bg-card/40 mx-auto flex w-full max-w-md flex-col gap-3 rounded-lg border p-3">
      <span className="text-foreground text-xs font-medium tracking-wide uppercase">
        {t("CHAT.LOADOUT.TITLE")}
      </span>
      <div className="grid grid-cols-2 gap-3">
        <EntityPicker
          label={t("CHAT.OVERRIDES.PRESET")}
          noneLabel={t("CHAT.OVERRIDES.NONE")}
          value={loadout.presetId}
          options={presets}
          onChange={(id) => patch({ presetId: id })}
        />
        <EntityPicker
          label={t("CHAT.OVERRIDES.PERSONA")}
          noneLabel={t("CHAT.OVERRIDES.NONE")}
          value={loadout.personaId}
          options={personas}
          onChange={(id) => patch({ personaId: id })}
        />
      </div>
      {(characters?.length ?? 0) > 0 && (
        <CharacterGallery
          characters={characters ?? []}
          value={loadout.characterIds}
          onChange={(ids) => patch({ characterIds: ids })}
        />
      )}
      <MultiPicker
        label={t("CHAT.OVERRIDES.CHARACTERS")}
        searchPlaceholder={t("CHAT.OVERRIDES.SEARCH_CHARACTERS")}
        emptyText={t("CHAT.OVERRIDES.NO_CHARACTERS")}
        value={loadout.characterIds}
        options={characters}
        onChange={(ids) => patch({ characterIds: ids })}
      />
      <MultiPicker
        label={t("CHAT.OVERRIDES.LOREBOOKS")}
        searchPlaceholder={t("CHAT.OVERRIDES.SEARCH_LOREBOOKS")}
        emptyText={t("CHAT.OVERRIDES.NO_LOREBOOKS")}
        value={loadout.lorebookIds}
        options={lorebooks}
        onChange={(ids) => patch({ lorebookIds: ids })}
      />
      {(cards?.length ?? 0) > 0 && (
        <EntityPicker
          label={t("RP.CARDS_TITLE")}
          noneLabel={t("CHAT.OVERRIDES.NONE")}
          value={null}
          options={cards}
          onChange={(id) => void applyCard(id)}
        />
      )}
      <p className="text-muted-foreground text-xs">{t("CHAT.LOADOUT.HINT")}</p>
    </div>
  );
}
