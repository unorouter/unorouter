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
import type { TranslationKey } from "@/lib/types";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useFieldArray, type UseFormReturn } from "react-hook-form";
import { FormFooter } from "../shared/form-footer";

const FORMAT_KEYS = {
  "openai-compatible": "CHAT.CUSTOM_PROVIDER.FORMAT_OPENAI",
} as const;

// Per-model tokenizer presets (budget counting). "hf-custom" is a sentinel that reveals an HF-slug input;
// the stored value becomes `hf:<slug>`. Order mirrors TOKENIZER_PRESETS + the custom option last.
const TOKENIZER_OPTIONS: { value: string; labelKey: TranslationKey }[] = [
  { value: "auto", labelKey: "CHAT.CUSTOM_PROVIDER.TOKENIZER_AUTO" },
  { value: "cl100k", labelKey: "CHAT.CUSTOM_PROVIDER.TOKENIZER_CL100K" },
  { value: "o200k", labelKey: "CHAT.CUSTOM_PROVIDER.TOKENIZER_O200K" },
  { value: "claude", labelKey: "CHAT.CUSTOM_PROVIDER.TOKENIZER_CLAUDE" },
  { value: "glm5", labelKey: "CHAT.CUSTOM_PROVIDER.TOKENIZER_GLM5" },
  { value: "glm4", labelKey: "CHAT.CUSTOM_PROVIDER.TOKENIZER_GLM4" },
  { value: "deepseek", labelKey: "CHAT.CUSTOM_PROVIDER.TOKENIZER_DEEPSEEK" },
  {
    value: "deepseek-v4",
    labelKey: "CHAT.CUSTOM_PROVIDER.TOKENIZER_DEEPSEEK_V4",
  },
  { value: "llama3", labelKey: "CHAT.CUSTOM_PROVIDER.TOKENIZER_LLAMA3" },
  { value: "gemma", labelKey: "CHAT.CUSTOM_PROVIDER.TOKENIZER_GEMMA" },
  { value: "qwen", labelKey: "CHAT.CUSTOM_PROVIDER.TOKENIZER_QWEN" },
  { value: "mistral", labelKey: "CHAT.CUSTOM_PROVIDER.TOKENIZER_MISTRAL" },
  { value: "cohere", labelKey: "CHAT.CUSTOM_PROVIDER.TOKENIZER_COHERE" },
  { value: "hf-custom", labelKey: "CHAT.CUSTOM_PROVIDER.TOKENIZER_HF_CUSTOM" },
];

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
      const existingKeys = new Set(form.getValues("models").map((m) => m.key));
      for (const id of ids) {
        if (!existingKeys.has(id))
          modelsArray.append({ key: id, label: id, tokenizer: "auto" });
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
          <MyFormKeyedSelect
            control={form.control}
            name="format"
            label={t("CHAT.CUSTOM_PROVIDER.FORMAT")}
            fallback="openai-compatible"
            optionKeys={FORMAT_KEYS}
          />

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
                  onClick={() =>
                    modelsArray.append({
                      key: "",
                      label: "",
                      tokenizer: "auto",
                    })
                  }
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
              <ModelRow
                key={fieldItem.id}
                form={form}
                index={index}
                onRemove={() => modelsArray.remove(index)}
              />
            ))}
          </div>

          <FormFooter onCancel={props.onDone} />
        </form>
      </Form>
    </Card>
  );
}

// One model row: key + label inputs, a per-model tokenizer select, and (for "Custom HF") a slug input.
// The stored value at models.${index}.tokenizer is a TokenizerRef: a preset id, "auto", or `hf:<slug>`.
function ModelRow(props: {
  form: UseFormReturn<CustomProviderForm>;
  index: number;
  onRemove: () => void;
}) {
  const t = useTranslations();
  const tokenizerField = `models.${props.index}.tokenizer` as const;
  const stored = props.form.watch(tokenizerField) ?? "auto";
  const isHf = typeof stored === "string" && stored.startsWith("hf:");
  const selectValue = isHf ? "hf-custom" : stored;
  const hfSlug = isHf ? stored.slice(3) : "";

  const onSelect = (value: string) => {
    // "hf-custom" stores an empty hf: ref until the user types a slug; presets store verbatim.
    const next = (
      value === "hf-custom" ? "hf:" : value
    ) as CustomProviderForm["models"][number]["tokenizer"];
    props.form.setValue(tokenizerField, next, { shouldDirty: true });
  };

  return (
    <div className="flex flex-col gap-1.5 rounded-md border p-2">
      <div className="flex items-center gap-2">
        <Input
          className="flex-1 font-mono text-xs"
          placeholder={t("CHAT.CUSTOM_PROVIDER.MODEL_KEY")}
          {...props.form.register(`models.${props.index}.key`)}
        />
        <Input
          className="flex-1 text-xs"
          placeholder={t("CHAT.CUSTOM_PROVIDER.MODEL_LABEL")}
          {...props.form.register(`models.${props.index}.label`)}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={props.onRemove}
        >
          <Icon name="trash-2" className="size-4" />
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground shrink-0 text-[11px]">
          {t("CHAT.CUSTOM_PROVIDER.TOKENIZER")}
        </span>
        <select
          className="border-input bg-background h-7 rounded-md border px-2 text-xs"
          value={selectValue}
          onChange={(e) => onSelect(e.target.value)}
        >
          {TOKENIZER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {t(opt.labelKey)}
            </option>
          ))}
        </select>
        {isHf && (
          <Input
            className="flex-1 font-mono text-xs"
            placeholder={t("CHAT.CUSTOM_PROVIDER.TOKENIZER_HF_PLACEHOLDER")}
            value={hfSlug}
            onChange={(e) =>
              props.form.setValue(tokenizerField, `hf:${e.target.value}`, {
                shouldDirty: true,
              })
            }
          />
        )}
      </div>
    </div>
  );
}
