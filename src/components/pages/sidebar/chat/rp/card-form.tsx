"use client";

import { MyFormInput } from "@/components/elements/form/my-form-input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  useCardQuery,
  useCharactersQuery,
  useCreateCardMutation,
  useLorebooksQuery,
  usePersonasQuery,
  useUpdateCardMutation,
} from "@/hooks/rp-hook";
import { typeboxResolver } from "@hookform/resolvers/typebox";
import { Value } from "@sinclair/typebox/value";
import { t as tt } from "elysia";
import type { Static } from "elysia";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { MultiSelectPopover } from "./multi-select-popover";
import { SortableList } from "@/components/elements/dnd/sortable-list";

const NONE = "__none__";

const cardFormSchema = tt.Object({
  name: tt.String({ minLength: 1, maxLength: 200, default: "" }),
  description: tt.String({ default: "", maxLength: 50_000 }),
  personaId: tt.String({ default: NONE }),
  characterIds: tt.Array(tt.String(), { default: [] }),
  lorebookIds: tt.Array(tt.String(), { default: [] }),
});
type CardForm = Static<typeof cardFormSchema>;

type Props = {
  editingId: string | "new";
  onDone: () => void;
};

export function CardForm(props: Props) {
  const t = useTranslations();
  const charactersQuery = useCharactersQuery();
  const personasQuery = usePersonasQuery();
  const lorebooksQuery = useLorebooksQuery();
  const cardQuery = useCardQuery(
    props.editingId === "new" ? undefined : props.editingId,
  );
  const createMut = useCreateCardMutation();
  const updateMut = useUpdateCardMutation();

  const form = useForm({
    resolver: typeboxResolver(cardFormSchema),
    defaultValues: Value.Default(cardFormSchema, {}) as CardForm,
  });

  useEffect(() => {
    if (props.editingId === "new") {
      form.reset(Value.Default(cardFormSchema, {}) as CardForm);
      return;
    }
    const c = cardQuery.data;
    if (!c) return;
    form.reset({
      name: c.name,
      description: c.description ?? "",
      personaId: c.personaId ?? NONE,
      characterIds: (c.cardCharacters ?? []).map(
        (cc: { characterId: string }) => cc.characterId,
      ),
      lorebookIds: (c.cardLorebooks ?? []).map(
        (cl: { lorebookId: string }) => cl.lorebookId,
      ),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.editingId, cardQuery.data]);

  const onSubmit = async (data: CardForm) => {
    const body = {
      name: data.name,
      description: data.description || null,
      personaId: data.personaId === NONE ? null : data.personaId,
      characterIds: data.characterIds,
      lorebookIds: data.lorebookIds,
    };
    if (props.editingId === "new") {
      await createMut.mutateAsync({ body });
    } else {
      await updateMut.mutateAsync({ id: props.editingId, body });
    }
    props.onDone();
  };

  const charLookup = new Map(
    (charactersQuery.data ?? []).map((c) => [c.id, c.name]),
  );
  const lbLookup = new Map(
    (lorebooksQuery.data ?? []).map((l) => [l.id, l.name]),
  );

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <MyFormInput
          control={form.control}
          name="name"
          schema={cardFormSchema}
          label={t("COMMON.NAME")}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("COMMON.DESCRIPTION")}</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  rows={3}
                  placeholder={t("RP.CARD_DESCRIPTION_PLACEHOLDER")}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="personaId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("RP.CARD_PERSONA")}</FormLabel>
              <FormControl>
                <Select
                  value={field.value}
                  onValueChange={(v) => field.onChange(v ?? NONE)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("RP.CARD_PERSONA_NONE")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>
                      {t("RP.CARD_PERSONA_NONE")}
                    </SelectItem>
                    {(personasQuery.data ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="characterIds"
          render={({ field }) => {
            const ids = field.value as string[];
            const orderedItems = ids
              .map((id) => ({ id, name: charLookup.get(id) ?? id }))
              .filter((it) => charLookup.has(it.id));
            return (
              <FormItem>
                <FormLabel>{t("RP.CARD_CHARACTERS")}</FormLabel>
                <FormControl>
                  <MultiSelectPopover
                    options={
                      charactersQuery.data?.map((c) => ({
                        id: c.id,
                        label: c.name,
                      })) ?? []
                    }
                    value={field.value}
                    onChange={field.onChange}
                    triggerLabel={t("RP.CARD_CHARACTERS")}
                    searchPlaceholder={t("CHAT.OVERRIDES.SEARCH_CHARACTERS")}
                    emptyText={t("CHAT.OVERRIDES.NO_CHARACTERS")}
                  />
                </FormControl>
                {orderedItems.length > 1 && (
                  <div className="mt-2">
                    <p className="text-muted-foreground mb-1 text-xs">
                      {t("CHAT.OVERRIDES.REORDER_HINT")}
                    </p>
                    <SortableList
                      items={orderedItems}
                      onReorder={(orderedIds) => field.onChange(orderedIds)}
                      renderItem={(item, handle) => (
                        <div className="border-border/40 bg-card flex items-center gap-2 rounded-md border px-2 py-1.5">
                          {handle}
                          <span className="truncate text-sm">{item.name}</span>
                        </div>
                      )}
                    />
                  </div>
                )}
              </FormItem>
            );
          }}
        />

        <FormField
          control={form.control}
          name="lorebookIds"
          render={({ field }) => {
            const ids = field.value as string[];
            const orderedItems = ids
              .map((id) => ({ id, name: lbLookup.get(id) ?? id }))
              .filter((it) => lbLookup.has(it.id));
            return (
              <FormItem>
                <FormLabel>{t("RP.CARD_LOREBOOKS")}</FormLabel>
                <FormControl>
                  <MultiSelectPopover
                    options={
                      lorebooksQuery.data?.map((l) => ({
                        id: l.id,
                        label: l.name,
                      })) ?? []
                    }
                    value={field.value}
                    onChange={field.onChange}
                    triggerLabel={t("RP.CARD_LOREBOOKS")}
                    searchPlaceholder={t("CHAT.OVERRIDES.SEARCH_LOREBOOKS")}
                    emptyText={t("CHAT.OVERRIDES.NO_LOREBOOKS")}
                  />
                </FormControl>
                {orderedItems.length > 1 && (
                  <div className="mt-2">
                    <p className="text-muted-foreground mb-1 text-xs">
                      {t("CHAT.OVERRIDES.REORDER_HINT")}
                    </p>
                    <SortableList
                      items={orderedItems}
                      onReorder={(orderedIds) => field.onChange(orderedIds)}
                      renderItem={(item, handle) => (
                        <div className="border-border/40 bg-card flex items-center gap-2 rounded-md border px-2 py-1.5">
                          {handle}
                          <span className="truncate text-sm">{item.name}</span>
                        </div>
                      )}
                    />
                  </div>
                )}
              </FormItem>
            );
          }}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={props.onDone}>
            {t("COMMON.CANCEL")}
          </Button>
          <Button type="submit">{t("COMMON.SAVE")}</Button>
        </div>
      </form>
    </Form>
  );
}
