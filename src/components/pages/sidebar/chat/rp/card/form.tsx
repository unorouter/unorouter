"use client";

import { MyFormInput } from "@/components/elements/form/my-form-input";
import { MyFormTextarea } from "@/components/elements/form/my-form-textarea";
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
import {
  useCardQuery,
  useCreateCardMutation,
  useUpdateCardMutation,
} from "@/hooks/ai/rp/cards";
import { useCharactersQuery } from "@/hooks/ai/rp/characters";
import { useLorebooksQuery } from "@/hooks/ai/rp/lorebooks";
import { usePersonasQuery } from "@/hooks/ai/rp/personas";
import { typeboxResolver } from "@hookform/resolvers/typebox";
import { Value } from "@sinclair/typebox/value";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { MyFormCombobox } from "@/components/elements/form/my-form-combobox";
import { NONE_VALUE as NONE } from "@/lib/config/constants";
import { cardFormSchema, type CardForm } from "@/lib/validation/rp-forms";

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
        <MyFormTextarea
          control={form.control}
          name="description"
          schema={cardFormSchema}
          label={t("COMMON.DESCRIPTION")}
          rows={3}
          placeholder={t("RP.CARD_DESCRIPTION_PLACEHOLDER")}
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

        <MyFormCombobox
          control={form.control}
          name="characterIds"
          label={t("RP.CARD_CHARACTERS")}
          searchPlaceholder={t("CHAT.OVERRIDES.SEARCH_CHARACTERS")}
          emptyText={t("CHAT.OVERRIDES.NO_CHARACTERS")}
          reorderHint={t("CHAT.OVERRIDES.REORDER_HINT")}
          options={charactersQuery.data}
        />

        <MyFormCombobox
          control={form.control}
          name="lorebookIds"
          label={t("RP.CARD_LOREBOOKS")}
          searchPlaceholder={t("CHAT.OVERRIDES.SEARCH_LOREBOOKS")}
          emptyText={t("CHAT.OVERRIDES.NO_LOREBOOKS")}
          reorderHint={t("CHAT.OVERRIDES.REORDER_HINT")}
          options={lorebooksQuery.data}
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
