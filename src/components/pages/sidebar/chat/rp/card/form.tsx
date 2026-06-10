"use client";

import { MyFormCombobox } from "@/components/elements/form/my-form-combobox";
import { MyFormInput } from "@/components/elements/form/my-form-input";
import { MyFormTextarea } from "@/components/elements/form/my-form-textarea";
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
import { NONE_VALUE as NONE } from "@/lib/config/constants";
import { formDefaults } from "@/lib/validation/helpers";
import { cardFormSchema, type CardForm } from "@/lib/validation/rp-forms";
import { useRpForm } from "@/hooks/ui/use-rp-form";
import { useTranslations } from "next-intl";
import { FormFooter } from "../shared/form-footer";

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

  // `values` syncs the row on settle; keepDirtyValues protects in-progress
  // typing. characterIds/lorebookIds come from join rows, not flat columns.
  const editing = props.editingId === "new" ? null : cardQuery.data;
  const formValues = editing
    ? formDefaults(cardFormSchema, {
        ...editing,
        characterIds: (editing.cardCharacters ?? []).map(
          (cc) => cc.characterId,
        ),
        lorebookIds: (editing.cardLorebooks ?? []).map((cl) => cl.lorebookId),
      })
    : undefined;
  const form = useRpForm(cardFormSchema, formValues);

  const onSubmit = async (data: CardForm) => {
    const body = {
      ...data,
      description: data.description || null,
      personaId: data.personaId === NONE ? null : data.personaId,
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

        <FormFooter onCancel={props.onDone} />
      </form>
    </Form>
  );
}
