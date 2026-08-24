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
import { readLocalCard } from "@/lib/db/client/data/rp/rp";
import { NONE_VALUE } from "@/lib/config/constants";
import { chatLoadoutAtom, type ChatLoadout } from "@/store/chat-store";
import { useAtom } from "jotai";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

type NamedEntity = { id: string; name: string; title?: string | null };

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
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground text-xs">{props.label}</span>
      <Select
        value={props.value ?? NONE_VALUE}
        onValueChange={(v) => props.onChange(v === NONE_VALUE ? null : v)}
      >
        <SelectTrigger className="h-8">
          <SelectValue>
            {(value: string) => {
              if (value === NONE_VALUE) return props.noneLabel;
              const match = options.find((o) => o.id === value);
              return match ? entityLabel(match) : props.noneLabel;
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE_VALUE}>{props.noneLabel}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              {entityLabel(o)}
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
  const lookup = new Map(options.map((o) => [o.id, o.name]));
  return (
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground text-xs">{props.label}</span>
      <Combobox
        items={options.map((o) => o.id)}
        multiple
        value={props.value}
        onValueChange={(next) => props.onChange(next)}
        itemToStringLabel={(id) => lookup.get(id) ?? id}
      >
        <ComboboxChips>
          <ComboboxValue>
            {(value: string[]) =>
              value.map((id) => (
                <ComboboxChip key={id} aria-label={lookup.get(id)}>
                  {lookup.get(id) ?? id}
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
                {lookup.get(id) ?? id}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
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
