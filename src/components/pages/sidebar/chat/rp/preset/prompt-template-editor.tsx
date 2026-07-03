"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SortableList } from "@/components/elements/dnd/sortable-list";
import {
  CHAT_RANGE_ALL,
  DEFAULT_PROMPT_TEMPLATE,
  parsePromptTemplate,
  type PromptItem,
  type PromptItemRole,
  type SlotName,
} from "@/lib/ai/chat/prompt/template";
import type { SamplingPresetForm } from "@/lib/validation/rp-forms";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useFormContext } from "react-hook-form";

// Editor cards carry a stable synthetic id for drag-and-drop; dropped when serializing back to PromptItem[].
type Card = PromptItem & { id: string };

const SLOT_LABELS: Record<SlotName, string> = {
  main: "Main prompt",
  description: "Character description",
  persona: "User persona",
  lorebook: "Lorebook",
  prefill: "Prefill",
  postHistory: "Post-history instructions",
  systemPrompt: "System prompt",
};

const ROLES: PromptItemRole[] = ["system", "user", "assistant"];

let idCounter = 0;
function makeId(): string {
  idCounter += 1;
  return `pt_${idCounter}`;
}

function toCards(items: PromptItem[]): Card[] {
  return items.map((it) => ({ ...it, id: makeId() }));
}

function toItems(cards: Card[]): PromptItem[] {
  // Strip the synthetic id without a delete (avoids the non-optional-delete rule).
  return cards.map(({ id: _id, ...item }) => item);
}

type Props = {
  // JSON string from the form (empty = default template).
  value: string;
  onChange: (json: string) => void;
};

export function PromptTemplateEditor(props: Props) {
  const t = useTranslations();
  // The prefill card edits the preset form's prefill field directly (the card is its only editor).
  const form = useFormContext<SamplingPresetForm>();
  const [cards, setCards] = useState<Card[]>(() =>
    toCards(parsePromptTemplate(props.value) ?? DEFAULT_PROMPT_TEMPLATE),
  );
  // Per-card collapse so a long post-history block isn't a scroll-trap; collapsed shows a capped preview, expanded auto-grows.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleExpanded = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const commit = (next: Card[]) => {
    setCards(next);
    props.onChange(JSON.stringify(toItems(next)));
  };

  const reorder = (orderedIds: string[]) => {
    const byId = new Map(cards.map((c) => [c.id, c]));
    commit(
      orderedIds
        .map((id) => byId.get(id))
        .filter((c): c is Card => c !== undefined),
    );
  };

  const update = (id: string, patch: Partial<PromptItem>) => {
    commit(cards.map((c) => (c.id === id ? ({ ...c, ...patch } as Card) : c)));
  };

  // Prefill text lives on its card; clearing it on delete stops an invisible prefill from still being appended.
  const remove = (id: string) => {
    const card = cards.find((c) => c.id === id);
    if (card?.type === "slot" && card.slot === "prefill") {
      form.setValue("prefill", "", { shouldDirty: true });
    }
    commit(cards.filter((c) => c.id !== id));
  };

  const addSlot = (slot: SlotName) =>
    commit([...cards, { id: makeId(), type: "slot", slot }]);
  const addPlain = () =>
    commit([
      ...cards,
      { id: makeId(), type: "plain", text: "", role: "system" },
    ]);
  const addChat = () =>
    commit([
      ...cards,
      {
        id: makeId(),
        type: "chat",
        rangeStart: CHAT_RANGE_ALL,
        rangeEnd: "end",
      },
    ]);

  const resetDefault = () => commit(toCards(DEFAULT_PROMPT_TEMPLATE));

  const usedSlots = new Set(
    cards
      .filter((c) => c.type === "slot")
      .map((c) => (c as { slot: SlotName }).slot),
  );
  const hasChat = cards.some((c) => c.type === "chat");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-foreground text-xs font-medium tracking-wide uppercase">
          {t("RP.PRESET_TEMPLATE_TITLE")}
        </span>
        <Button type="button" variant="ghost" size="sm" onClick={resetDefault}>
          {t("RP.PRESET_TEMPLATE_RESET")}
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">
        {t("RP.PRESET_TEMPLATE_HINT")}
      </p>

      <SortableList
        items={cards}
        onReorder={reorder}
        renderItem={(card, handle, isDragging) => (
          <Card className="flex flex-row items-start gap-2 p-2">
            <div className="pt-1">{handle}</div>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              {card.type === "slot" && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">
                    {SLOT_LABELS[card.slot] ?? card.slot}
                  </span>
                  {card.slot === "prefill" && (
                    <>
                      <Textarea
                        value={form.watch("prefill") ?? ""}
                        onChange={(e) =>
                          form.setValue("prefill", e.target.value, {
                            shouldDirty: true,
                          })
                        }
                        className="max-h-24 overflow-y-auto"
                        placeholder={t("RP.PRESET_PREFILL_PLACEHOLDER")}
                      />
                      <p className="text-muted-foreground text-xs">
                        {t("RP.PRESET_PREFILL_HINT")}
                      </p>
                    </>
                  )}
                </div>
              )}
              {card.type === "chat" && (
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium">
                    {t("RP.PRESET_TEMPLATE_CHAT")}
                  </span>
                  <p className="text-muted-foreground text-xs">
                    {t("RP.PRESET_TEMPLATE_CHAT_HINT")}
                  </p>
                </div>
              )}
              {card.type === "plain" && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <Select
                      value={card.role}
                      onValueChange={(v) =>
                        update(card.id, { role: v as PromptItemRole })
                      }
                    >
                      <SelectTrigger className="h-7 w-32">
                        <SelectValue>{card.role}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => toggleExpanded(card.id)}
                      aria-label={t(
                        expanded.has(card.id)
                          ? "RP.PRESET_TEMPLATE_COLLAPSE"
                          : "RP.PRESET_TEMPLATE_EXPAND",
                      )}
                    >
                      <Icon
                        name={
                          expanded.has(card.id)
                            ? "chevrons-up"
                            : "chevrons-down"
                        }
                        className="size-4"
                      />
                    </Button>
                  </div>
                  <Textarea
                    value={card.text}
                    onChange={(e) => update(card.id, { text: e.target.value })}
                    className={
                      expanded.has(card.id) && !isDragging
                        ? "max-h-[60vh]"
                        : "max-h-24 overflow-y-auto"
                    }
                    placeholder={t("RP.PRESET_TEMPLATE_PLAIN_PLACEHOLDER")}
                  />
                </div>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => remove(card.id)}
              aria-label={t("COMMON.DELETE")}
            >
              <Icon name="trash-2" className="size-4" />
            </Button>
          </Card>
        )}
      />

      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button type="button" variant="outline" size="sm" />}
        >
          <Icon name="plus" className="mr-2 size-4" />
          {t("RP.PRESET_TEMPLATE_ADD")}
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {!hasChat && (
            <DropdownMenuItem onClick={addChat}>
              {t("RP.PRESET_TEMPLATE_CHAT")}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={addPlain}>
            {t("RP.PRESET_TEMPLATE_PLAIN")}
          </DropdownMenuItem>
          {(Object.keys(SLOT_LABELS) as SlotName[])
            .filter((s) => !usedSlots.has(s))
            .map((s) => (
              <DropdownMenuItem key={s} onClick={() => addSlot(s)}>
                {SLOT_LABELS[s]}
              </DropdownMenuItem>
            ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
