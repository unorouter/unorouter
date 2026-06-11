"use client";

import { MyFormInput } from "@/components/elements/form/my-form-input";
import { MyFormSwitch } from "@/components/elements/form/my-form-switch";
import { MyFormTextarea } from "@/components/elements/form/my-form-textarea";
import { Card } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import {
  useCreatePersonaMutation,
  usePersonaQuery,
  useUpdatePersonaMutation,
} from "@/hooks/ai/rp/personas";
import { formDefaults } from "@/lib/validation/helpers";
import { personaFormSchema, type PersonaForm } from "@/lib/validation/rp-forms";
import { useRpForm } from "@/hooks/ui/use-rp-form";
import { useTranslations } from "next-intl";
import { FormFooter } from "../shared/form-footer";

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

  // `values` syncs the row on settle; keepDirtyValues protects in-progress
  // typing. Parent keys this component by editingId for clean remounts.
  const formValues =
    !isNew && existing ? formDefaults(personaFormSchema, existing) : undefined;
  const form = useRpForm(personaFormSchema, formValues);

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
          <FormFooter onCancel={props.onDone} />
        </form>
      </Form>
    </Card>
  );
}
