"use client";

import { MyFormInput } from "@/components/elements/form/my-form-input";
import { MyFormKeyedSelect } from "@/components/elements/form/my-form-keyed-select";
import { MyFormSwitch } from "@/components/elements/form/my-form-switch";
import { MyFormTextarea } from "@/components/elements/form/my-form-textarea";
import { Card } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import {
  useCreateJsPluginMutation,
  useJsPluginQuery,
  useUpdateJsPluginMutation,
} from "@/hooks/ai/js-plugins-hook";
import { useRpForm } from "@/hooks/ui/use-rp-form";
import { detectPluginKind } from "@/lib/ai/chat/plugins/engine";
import { formDefaults } from "@/lib/validation/helpers";
import { jsPluginForm, type JsPluginForm } from "@/lib/validation/js-plugin";
import { useTranslations } from "next-intl";
import { FormFooter } from "../shared/form-footer";

const KIND_KEYS = {
  risu: "CHAT.JS_PLUGIN.KIND_RISU",
  janitor: "CHAT.JS_PLUGIN.KIND_JANITOR",
} as const;

type Props = {
  editingId: string | "new";
  onDone: () => void;
};

export function JsPluginEditor(props: Props) {
  const t = useTranslations();
  const isNew = props.editingId === "new";
  const pluginQuery = useJsPluginQuery(isNew ? undefined : props.editingId);
  const createMut = useCreateJsPluginMutation();
  const updateMut = useUpdateJsPluginMutation();
  const existing = pluginQuery.data;

  const formValues =
    !isNew && existing ? formDefaults(jsPluginForm, existing) : undefined;
  const form = useRpForm(jsPluginForm, formValues);

  const onSubmit = async (data: JsPluginForm) => {
    if (isNew) {
      await createMut.mutateAsync({ body: data });
    } else {
      await updateMut.mutateAsync({ id: props.editingId, body: data });
    }
    props.onDone();
  };

  const handleScriptPaste = (value: string) => {
    if (!isNew || !value.trim()) return;
    form.setValue("kind", detectPluginKind(value), { shouldDirty: true });
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
            schema={jsPluginForm}
            label={t("CHAT.JS_PLUGIN.NAME")}
          />
          <MyFormKeyedSelect
            control={form.control}
            name="kind"
            label={t("CHAT.JS_PLUGIN.KIND")}
            fallback="risu"
            optionKeys={KIND_KEYS}
          />
          <MyFormSwitch
            control={form.control}
            name="enabled"
            label={t("CHAT.JS_PLUGIN.ENABLED")}
          />

          <MyFormTextarea
            control={form.control}
            name="script"
            schema={jsPluginForm}
            label={t("CHAT.JS_PLUGIN.SCRIPT")}
            description={t("CHAT.JS_PLUGIN.SCRIPT_HINT")}
            className="min-h-64 font-mono text-xs"
            spellCheck={false}
            placeholder={t("CHAT.JS_PLUGIN.SCRIPT_PLACEHOLDER")}
            onBlur={(e) => handleScriptPaste(e.target.value)}
          />

          <FormFooter onCancel={props.onDone} />
        </form>
      </Form>
    </Card>
  );
}
