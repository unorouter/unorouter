"use client";

import { MyFormInput } from "@/components/elements/form/my-form-input";
import { MyFormSwitch } from "@/components/elements/form/my-form-switch";
import { MyFormTextarea } from "@/components/elements/form/my-form-textarea";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import {
  useCharacterQuery,
  useCreateCharacterMutation,
  useUpdateCharacterMutation,
} from "@/hooks/ai/rp/characters";
import {
  characterFormSchema,
  type CharacterForm,
} from "@/lib/validation/rp-forms";
import { typeboxResolver } from "@hookform/resolvers/typebox";
import { csvToArray } from "@/lib/utils/base";
import { formDefaults } from "@/lib/validation/helpers";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

type Props = {
  characterId?: string;
  onSaved: () => void;
};

export function CharacterEditor(props: Props) {
  const t = useTranslations();
  const characterQuery = useCharacterQuery(props.characterId);
  const createMut = useCreateCharacterMutation();
  const updateMut = useUpdateCharacterMutation();
  const existing = characterQuery.data;

  const form = useForm({
    resolver: typeboxResolver(characterFormSchema),
    defaultValues: formDefaults(characterFormSchema),
  });

  useEffect(() => {
    if (!existing) {
      form.reset(formDefaults(characterFormSchema));
      return;
    }
    // tags/triggers are string[] columns; the form edits them comma-joined.
    form.reset(
      formDefaults(characterFormSchema, {
        ...existing,
        tags: Array.isArray(existing.tags) ? existing.tags.join(", ") : "",
        triggers: Array.isArray(existing.triggers)
          ? existing.triggers.join(", ")
          : "",
      }),
    );
    // form.reset is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing]);

  const onSubmit = async (data: CharacterForm) => {
    const body = {
      ...data,
      // tags/triggers go back to string[] columns.
      tags: csvToArray(data.tags),
      triggers: csvToArray(data.triggers),
    };
    if (props.characterId) {
      await updateMut.mutateAsync({ id: props.characterId, body });
    } else {
      await createMut.mutateAsync({ body });
    }
    props.onSaved();
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
          schema={characterFormSchema}
          label={t("RP.CHARACTER_NAME")}
        />

        <MyFormTextarea
          control={form.control}
          name="description"
          schema={characterFormSchema}
          label={t("RP.CHARACTER_DESCRIPTION")}
          rows={4}
        />
        <MyFormTextarea
          control={form.control}
          name="personality"
          schema={characterFormSchema}
          label={t("RP.CHARACTER_PERSONALITY")}
          rows={3}
        />
        <MyFormTextarea
          control={form.control}
          name="scenario"
          schema={characterFormSchema}
          label={t("RP.CHARACTER_SCENARIO")}
          rows={3}
        />
        <MyFormTextarea
          control={form.control}
          name="firstMessage"
          schema={characterFormSchema}
          label={t("RP.CHARACTER_FIRST_MESSAGE")}
          rows={4}
        />
        <MyFormTextarea
          control={form.control}
          name="exampleMessages"
          schema={characterFormSchema}
          label={t("RP.CHARACTER_EXAMPLE_MESSAGES")}
          rows={4}
        />
        <MyFormTextarea
          control={form.control}
          name="systemPrompt"
          schema={characterFormSchema}
          label={t("RP.CHARACTER_SYSTEM_PROMPT")}
          rows={4}
        />
        <MyFormTextarea
          control={form.control}
          name="postHistoryInstructions"
          schema={characterFormSchema}
          label={t("RP.CHARACTER_POST_HISTORY")}
          rows={3}
        />
        <MyFormInput
          control={form.control}
          name="tags"
          schema={characterFormSchema}
          label={t("RP.CHARACTER_TAGS")}
          placeholder="fantasy, adventure"
        />
        <MyFormSwitch
          control={form.control}
          name="nsfw"
          label={t("RP.CHARACTER_NSFW")}
        />

        <div className="border-border/40 flex flex-col gap-3 rounded-lg border p-3">
          <div className="text-foreground text-xs font-medium tracking-wide uppercase">
            {t("RP.CHARACTER_ACTIVATION_TITLE")}
          </div>
          <p className="text-muted-foreground text-xs">
            {t("RP.CHARACTER_ACTIVATION_HINT")}
          </p>
          <div className="flex flex-col gap-1">
            <MyFormSwitch
              control={form.control}
              name="alwaysActive"
              label={t("RP.CHARACTER_ALWAYS_ACTIVE")}
            />
            <p className="text-muted-foreground text-xs">
              {t("RP.CHARACTER_ALWAYS_ACTIVE_HINT")}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <MyFormInput
              control={form.control}
              name="triggers"
              schema={characterFormSchema}
              label={t("RP.CHARACTER_TRIGGERS")}
              placeholder="alice, knight, sword"
            />
            <p className="text-muted-foreground text-xs">
              {t("RP.CHARACTER_TRIGGERS_HINT")}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <MyFormSwitch
              control={form.control}
              name="matchWholeWords"
              label={t("RP.CHARACTER_MATCH_WHOLE_WORDS")}
            />
            <p className="text-muted-foreground text-xs">
              {t("RP.CHARACTER_MATCH_WHOLE_WORDS_HINT")}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="submit"
            disabled={createMut.isPending || updateMut.isPending}
          >
            {t("COMMON.SAVE")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
