"use client";

import { MyFormInput } from "@/components/elements/form/my-form-input";
import { MyFormSwitch } from "@/components/elements/form/my-form-switch";
import { MyFormTextarea } from "@/components/elements/form/my-form-textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import {
  useCreatePersonaMutation,
  usePersonaQuery,
  useUpdatePersonaMutation,
} from "@/hooks/ai/rp/personas";
import { formDefaults } from "@/lib/validation/helpers";
import { personaFormSchema, type PersonaForm } from "@/lib/validation/rp-forms";
import { typeboxResolver } from "@hookform/resolvers/typebox";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

type Props = {
  editingId: string | "new";
  onDone: () => void;
};

export function PersonaEditor(props: Props) {
  const t = useTranslations();
  const isNew = props.editingId === "new";
  const personaQuery = usePersonaQuery(isNew ? undefined : props.editingId);
  const createMut = useCreatePersonaMutation();
  const updateMut = useUpdatePersonaMutation();
  const existing = personaQuery.data;

  const form = useForm({
    resolver: typeboxResolver(personaFormSchema),
    defaultValues: formDefaults(personaFormSchema),
  });

  useEffect(() => {
    if (isNew || !existing) {
      form.reset(formDefaults(personaFormSchema));
      return;
    }
    form.reset(formDefaults(personaFormSchema, existing));
    // form.reset is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew, existing]);

  const onSubmit = async (data: PersonaForm) => {
    if (isNew) {
      await createMut.mutateAsync({ body: data });
    } else {
      await updateMut.mutateAsync({ id: props.editingId, body: data });
    }
    props.onDone();
  };

  return (
    <Card className="flex flex-col gap-3 p-4">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-3"
        >
          <MyFormInput
            control={form.control}
            name="name"
            schema={personaFormSchema}
            label={t("COMMON.NAME")}
          />
          <span className="text-muted-foreground -mt-2 text-xs">
            {t("RP.PERSONA_NAME_HINT")}
          </span>
          <MyFormTextarea
            control={form.control}
            name="description"
            schema={personaFormSchema}
            label={t("COMMON.DESCRIPTION")}
            rows={3}
          />
          <MyFormSwitch
            control={form.control}
            name="isDefault"
            label={t("RP.PERSONA_DEFAULT")}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={props.onDone}>
              {t("COMMON.CANCEL")}
            </Button>
            <Button type="submit">{t("COMMON.SAVE")}</Button>
          </div>
        </form>
      </Form>
    </Card>
  );
}
