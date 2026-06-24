"use client";

import { MyFormInput } from "@/components/elements/form/my-form-input";
import { MyFormKeyedSelect } from "@/components/elements/form/my-form-keyed-select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import {
  useCreateCustomProviderMutation,
  useCustomProviderQuery,
  useUpdateCustomProviderMutation,
} from "@/hooks/ai/custom-providers-hook";
import { fetchCustomProviderModels } from "@/lib/ai/chat/custom-provider-id";
import { toast } from "sonner";
import { formDefaults } from "@/lib/validation/helpers";
import {
  customProviderForm,
  type CustomProviderForm,
} from "@/lib/validation/custom-provider";
import { useRpForm } from "@/hooks/ui/use-rp-form";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useFieldArray } from "react-hook-form";
import { FormFooter } from "../shared/form-footer";

const FORMAT_KEYS = {
  "openai-compatible": "CHAT.CUSTOM_PROVIDER.FORMAT_OPENAI",
} as const;

const TOKENIZER_KEYS = {
  cl100k: "CHAT.CUSTOM_PROVIDER.TOKENIZER_CL100K",
  o200k: "CHAT.CUSTOM_PROVIDER.TOKENIZER_O200K",
  claude: "CHAT.CUSTOM_PROVIDER.TOKENIZER_CLAUDE",
  gemini: "CHAT.CUSTOM_PROVIDER.TOKENIZER_GEMINI",
} as const;

type Props = {
  editingId: string | "new";
  onDone: () => void;
};

export function CustomProviderEditor(props: Props) {
  const t = useTranslations();
  const isNew = props.editingId === "new";
  const providerQuery = useCustomProviderQuery(
    isNew ? undefined : props.editingId,
  );
  const createMut = useCreateCustomProviderMutation();
  const updateMut = useUpdateCustomProviderMutation();
  const existing = providerQuery.data;
  const [fetching, setFetching] = useState(false);

  const formValues =
    !isNew && existing ? formDefaults(customProviderForm, existing) : undefined;
  const form = useRpForm(customProviderForm, formValues);
  const modelsArray = useFieldArray({ control: form.control, name: "models" });

  const onSubmit = async (data: CustomProviderForm) => {
    if (isNew) {
      await createMut.mutateAsync({ body: data });
    } else {
      await updateMut.mutateAsync({ id: props.editingId, body: data });
    }
    props.onDone();
  };

  const handleFetchModels = async () => {
    const baseUrl = form.getValues("baseUrl");
    const apiKey = form.getValues("apiKey");
    if (!baseUrl) return;
    setFetching(true);
    try {
      const ids = await fetchCustomProviderModels(baseUrl, apiKey);
      const existingKeys = new Set(
        form.getValues("models").map((m) => m.key),
      );
      for (const id of ids) {
        if (!existingKeys.has(id)) modelsArray.append({ key: id, label: id });
      }
    } catch (e) {
      const status = (e as { status?: number }).status;
      toast.error(
        t("CHAT.CUSTOM_PROVIDER.FETCH_FAILED", { status: status ?? "" }),
      );
    } finally {
      setFetching(false);
    }
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
            schema={customProviderForm}
            label={t("CHAT.CUSTOM_PROVIDER.NAME")}
          />
          <MyFormInput
            control={form.control}
            name="baseUrl"
            schema={customProviderForm}
            label={t("CHAT.CUSTOM_PROVIDER.BASE_URL")}
            placeholder="https://api.example.com/v1"
          />
          <MyFormInput
            control={form.control}
            name="apiKey"
            schema={customProviderForm}
            label={t("CHAT.CUSTOM_PROVIDER.API_KEY")}
            type="password"
          />
          <div className="grid grid-cols-2 gap-3">
            <MyFormKeyedSelect
              control={form.control}
              name="format"
              label={t("CHAT.CUSTOM_PROVIDER.FORMAT")}
              fallback="openai-compatible"
              optionKeys={FORMAT_KEYS}
            />
            <MyFormKeyedSelect
              control={form.control}
              name="tokenizer"
              label={t("CHAT.CUSTOM_PROVIDER.TOKENIZER")}
              fallback="cl100k"
              optionKeys={TOKENIZER_KEYS}
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {t("CHAT.CUSTOM_PROVIDER.MODELS")}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={fetching}
                  onClick={handleFetchModels}
                >
                  <Icon
                    name={fetching ? "loader" : "download"}
                    className={fetching ? "size-4 animate-spin" : "size-4"}
                  />
                  <span>{t("CHAT.CUSTOM_PROVIDER.FETCH_MODELS")}</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => modelsArray.append({ key: "", label: "" })}
                >
                  <Icon name="plus" className="size-4" />
                  <span>{t("CHAT.CUSTOM_PROVIDER.ADD_MODEL")}</span>
                </Button>
              </div>
            </div>

            {modelsArray.fields.length === 0 && (
              <span className="text-muted-foreground text-xs">
                {t("CHAT.CUSTOM_PROVIDER.MODELS_EMPTY")}
              </span>
            )}

            {modelsArray.fields.map((fieldItem, index) => (
              <div key={fieldItem.id} className="flex items-center gap-2">
                <Input
                  className="flex-1 font-mono text-xs"
                  placeholder={t("CHAT.CUSTOM_PROVIDER.MODEL_KEY")}
                  {...form.register(`models.${index}.key`)}
                />
                <Input
                  className="flex-1 text-xs"
                  placeholder={t("CHAT.CUSTOM_PROVIDER.MODEL_LABEL")}
                  {...form.register(`models.${index}.label`)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => modelsArray.remove(index)}
                >
                  <Icon name="trash-2" className="size-4" />
                </Button>
              </div>
            ))}
          </div>

          <FormFooter onCancel={props.onDone} />
        </form>
      </Form>
    </Card>
  );
}
