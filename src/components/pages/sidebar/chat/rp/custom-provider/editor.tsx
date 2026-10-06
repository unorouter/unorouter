"use client";

import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import { MyFormInput } from "@/components/elements/form/my-form-input";
import { MyFormSwitch } from "@/components/elements/form/my-form-switch";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Icon } from "@/components/ui/icon";
import { Form } from "@/components/ui/form";
import {
  type CatalogTarget,
  useCreateCustomProviderMutation,
  useCustomProviderCatalogQuery,
  useCustomProviderQuery,
  useUpdateCustomProviderMutation,
} from "@/hooks/ai/custom-providers-hook";
import { ModelListError } from "@/lib/ai/chat/custom-provider-id";
import { toast } from "sonner";
import { formDefaults } from "@/lib/validation/helpers";
import {
  customProviderForm,
  type CustomProviderForm,
  MAX_MODELS,
} from "@/lib/validation/custom-provider";
import { useRpForm } from "@/hooks/ui/use-rp-form";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { FormFooter } from "../shared/form-footer";
import { ModelCatalog } from "./model-catalog";

// All of these answer a browser preflight, so none needs the proxy.
const QUICK_STARTS = [
  { name: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1" },
  { name: "NanoGPT", baseUrl: "https://nano-gpt.com/api/v1" },
  { name: "Chutes", baseUrl: "https://llm.chutes.ai/v1" },
  { name: "Featherless", baseUrl: "https://api.featherless.ai/v1" },
  { name: "DeepSeek", baseUrl: "https://api.deepseek.com/v1" },
  { name: "OpenAI", baseUrl: "https://api.openai.com/v1" },
  { name: "Mistral", baseUrl: "https://api.mistral.ai/v1" },
  { name: "Groq", baseUrl: "https://api.groq.com/openai/v1" },
  { name: "Ollama", baseUrl: "http://localhost:11434/v1" },
  { name: "LM Studio", baseUrl: "http://localhost:1234/v1" },
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
  const [requested, setRequested] = useState<CatalogTarget | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const catalogQuery = useCustomProviderCatalogQuery(
    requested ??
      (existing
        ? {
            baseUrl: existing.baseUrl,
            apiKey: existing.apiKey,
            proxy: existing.proxy,
          }
        : null),
  );

  const formValues =
    !isNew && existing ? formDefaults(customProviderForm, existing) : undefined;
  const form = useRpForm(customProviderForm, formValues);

  const onInvalid = () => {
    toast.error(
      form.getValues("models").length > MAX_MODELS
        ? t("CHAT.CUSTOM_PROVIDER.TOO_MANY_MODELS", { max: MAX_MODELS })
        : t("CHAT.CUSTOM_PROVIDER.FORM_INVALID"),
    );
  };

  const onSubmit = async (values: CustomProviderForm) => {
    const data = {
      ...values,
      models: values.models.map((m) => ({
        ...m,
        label: m.label.trim() || m.key,
      })),
    };
    if (isNew) {
      await createMut.mutateAsync({ body: data });
    } else {
      await updateMut.mutateAsync({ id: props.editingId, body: data });
    }
    props.onDone();
  };

  const fetchCatalog = () => {
    const baseUrl = form.getValues("baseUrl");
    if (!baseUrl) return;
    const next = {
      baseUrl,
      apiKey: form.getValues("apiKey"),
      proxy: form.getValues("proxy"),
    };
    if (
      requested?.baseUrl === next.baseUrl &&
      requested.apiKey === next.apiKey &&
      requested.proxy === next.proxy
    )
      void catalogQuery.refetch();
    else setRequested(next);
  };

  const pickQuickStart = (start: (typeof QUICK_STARTS)[number]) => {
    const name = form.getValues("name");
    if (!name || QUICK_STARTS.some((s) => s.name === name))
      form.setValue("name", start.name, { shouldDirty: true });
    form.setValue("baseUrl", start.baseUrl, { shouldDirty: true });
    form.setValue("proxy", false, { shouldDirty: true });
    setRequested({
      baseUrl: start.baseUrl,
      apiKey: form.getValues("apiKey"),
      proxy: false,
    });
  };

  const retryThroughProxy = () => {
    form.setValue("proxy", true, { shouldDirty: true });
    fetchCatalog();
  };

  const error = catalogQuery.error;
  const blocked =
    error !== null &&
    !(error instanceof ModelListError && (error.status || error.notJson));
  const errorText = !error
    ? null
    : error instanceof ModelListError && error.status
      ? t("CHAT.CUSTOM_PROVIDER.FETCH_FAILED", { status: error.status })
      : error instanceof ModelListError && error.notJson
        ? t("CHAT.CUSTOM_PROVIDER.FETCH_NOT_JSON")
        : t("CHAT.CUSTOM_PROVIDER.FETCH_BLOCKED");

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit, onInvalid)}
        className="flex flex-col gap-4"
      >
        {isNew && (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">
              {t("CHAT.CUSTOM_PROVIDER.QUICK_START")}
            </span>
            <div className="flex flex-wrap gap-2">
              {QUICK_STARTS.map((start) => (
                <Button
                  key={start.name}
                  type="button"
                  variant={
                    form.watch("baseUrl") === start.baseUrl
                      ? "secondary"
                      : "outline"
                  }
                  size="sm"
                  onClick={() => pickQuickStart(start)}
                >
                  <VendorIcon vendor={start.name} size={14} />
                  <span>{start.name}</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
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
        </div>
        <MyFormInput
          control={form.control}
          name="apiKey"
          schema={customProviderForm}
          label={t("CHAT.CUSTOM_PROVIDER.API_KEY")}
          type="password"
        />
        <Collapsible
          open={advancedOpen || form.watch("proxy")}
          onOpenChange={setAdvancedOpen}
        >
          <CollapsibleTrigger className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs">
            <Icon
              name={
                advancedOpen || form.watch("proxy")
                  ? "chevron-down"
                  : "chevron-right"
              }
              className="size-3.5"
            />
            {t("CHAT.CUSTOM_PROVIDER.ADVANCED")}
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <MyFormSwitch
              control={form.control}
              name="proxy"
              label={t("CHAT.CUSTOM_PROVIDER.PROXY")}
              description={t("CHAT.CUSTOM_PROVIDER.PROXY_HINT")}
            />
          </CollapsibleContent>
        </Collapsible>

        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">
            {t("CHAT.CUSTOM_PROVIDER.MODELS")}
          </span>
          <span className="text-muted-foreground text-xs">
            {t("CHAT.CUSTOM_PROVIDER.MODELS_HINT")}
          </span>
        </div>
        <ModelCatalog
          form={form}
          catalog={catalogQuery.data}
          fetching={catalogQuery.isFetching}
          error={
            errorText && (
              <span className="flex flex-col items-start gap-2">
                {errorText}
                {blocked && !form.watch("proxy") && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={retryThroughProxy}
                  >
                    {t("CHAT.CUSTOM_PROVIDER.RETRY_PROXY")}
                  </Button>
                )}
              </span>
            )
          }
          onFetch={fetchCatalog}
        />

        <FormFooter onCancel={props.onDone} />
      </form>
    </Form>
  );
}
