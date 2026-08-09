"use client";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import type { ImageFormValues } from "@/lib/validation/image";
import { useTranslations } from "next-intl";
import { Controller } from "react-hook-form";
import { AspectRatioSection } from "../fields/aspect-ratio-field";
import { CivitaiResolverField } from "../fields/civitai-resolver-field";
import { LoraPicker } from "../fields/lora-picker";
import { ReferenceUploader } from "../fields/reference-uploader";
import { TokenEstimate } from "../fields/token-estimate";
import {
  clampVariants,
  CUSTOM_CIVITAI_MODEL_ID,
  VARIANT_CHOICES,
} from "../image-constants";
import { useImageNav } from "../image-nav";
import { AdvancedFields } from "./sections/advanced-fields";
import { applyPreset } from "./logic/apply-preset";
import { CoreParamsFields } from "./sections/core-params-fields";
import { Img2ImgSection } from "./sections/img2img-section";
import { ModelPicker } from "./sections/model-picker";
import { PngImport } from "./sections/png-import";
import { PresetBar } from "./sections/preset-bar";
import { SubmitBar } from "./sections/submit-bar";
import { useCheckpoint } from "./hooks/use-checkpoint";
import { useImageForm } from "./hooks/use-image-form";
import { useSubmitGeneration } from "./hooks/use-submit-generation";
import { VendorParamsFields } from "./sections/vendor-params-fields";

export function ImageForm() {
  const t = useTranslations();
  const nav = useImageNav();

  const gen = useImageForm();
  const form = gen.form;
  const descriptor = gen.descriptor;
  const checkpoint = useCheckpoint(form);
  const activeCheckpoint = checkpoint.activeCheckpoint;

  const submit = useSubmitGeneration({
    form,
    activeCheckpoint,
    setSamplerMemory: (params, model) =>
      gen.setSamplerMemory({ ...gen.samplerMemory, [model]: params ?? {} }),
    setDraft: (values) =>
      gen.setDraft({
        model: values.model,
        prompt: values.prompt ?? "",
        negativePrompt: values.negativePrompt ?? "",
        params: values.params ?? {},
        loras: values.loras,
        references: values.references,
        extraParams: values.ui ?? { variants: 1 },
      }),
  });

  return (
    <Form {...form}>
      <form onSubmit={submit.onSubmit} className="flex flex-col gap-6">
        <PngImport />

        <PresetBar
          getCurrent={() => ({
            model: form.getValues("model"),
            negativePrompt: form.getValues("negativePrompt"),
            params: form.getValues("params"),
            loras: form.getValues("loras"),
            extraParams: form.getValues("ui"),
          })}
          onApply={(preset) =>
            applyPreset(
              {
                form,
                adoptModelTab: gen.adoptModelTab,
                changeModel: gen.changeModel,
              },
              preset,
            )
          }
        />

        <FormField
          control={form.control}
          name="model"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("IMAGE.MODEL_LABEL")}</FormLabel>
              <FormControl>
                <ModelPicker
                  models={gen.effectiveModels}
                  selected={descriptor}
                  activeTab={nav.tab}
                  onSelect={(id) => {
                    field.onChange(id);
                    gen.changeModel(id);
                    checkpoint.setCheckpoint(null);
                  }}
                  onSelectCustom={(picked) => {
                    // The passthrough model carries no checkpoint of its own; the AIR
                    // rides on the request, the picker label shows the resolved name.
                    field.onChange(CUSTOM_CIVITAI_MODEL_ID);
                    gen.changeModel(CUSTOM_CIVITAI_MODEL_ID);
                    checkpoint.setCheckpoint(picked);
                  }}
                  customLabel={activeCheckpoint?.name ?? null}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {descriptor.id === CUSTOM_CIVITAI_MODEL_ID && (
          <Controller
            control={form.control}
            name="ui.airQuery"
            render={({ field }) => (
              <CivitaiResolverField
                value={activeCheckpoint}
                onChange={checkpoint.setCheckpoint}
                query={field.value ?? ""}
                onQueryChange={field.onChange}
              />
            )}
          />
        )}

        {descriptor.supportsSize && <AspectRatioSection />}

        <FormField
          control={form.control}
          name="prompt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("IMAGE.PROMPT_LABEL")}</FormLabel>
              <FormControl>
                <Textarea
                  rows={4}
                  placeholder={t("IMAGE.PROMPT_PLACEHOLDER")}
                  value={field.value ?? ""}
                  onChange={field.onChange}
                />
              </FormControl>
              <TokenEstimate
                text={field.value ?? ""}
                family={descriptor.family}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        {descriptor.supportsNegativePrompt && (
          <FormField
            control={form.control}
            name="negativePrompt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("IMAGE.NEGATIVE_PROMPT_LABEL")}</FormLabel>
                <FormControl>
                  <Textarea
                    rows={2}
                    value={field.value ?? ""}
                    onChange={field.onChange}
                  />
                </FormControl>
                <TokenEstimate
                  text={field.value ?? ""}
                  family={descriptor.family}
                />
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <CoreParamsFields form={form} descriptor={descriptor} />

        <VariantsField />

        {descriptor.supportsLoraChain && (
          <Controller
            control={form.control}
            name="loras"
            render={({ field }) => (
              <LoraPicker
                family={descriptor.family}
                checkpointArchitecture={activeCheckpoint?.architecture ?? null}
                value={field.value ?? []}
                onChange={(loras) =>
                  field.onChange(loras.length > 0 ? loras : undefined)
                }
                onAppendPrompt={(words) => {
                  const current = form.getValues("prompt") ?? "";
                  if (current.includes(words)) return;
                  form.setValue(
                    "prompt",
                    current.trim() ? `${current.trim()}, ${words}` : words,
                    { shouldDirty: true },
                  );
                }}
              />
            )}
          />
        )}

        {descriptor.supportsReferences && (
          <Controller
            control={form.control}
            name="references"
            render={({ field }) => (
              <ReferenceUploader
                maxFiles={descriptor.maxReferenceImages}
                value={field.value ?? []}
                onChange={(refs) =>
                  field.onChange(refs.length > 0 ? refs : undefined)
                }
              />
            )}
          />
        )}

        <VendorParamsFields form={form} descriptor={descriptor} />

        <Img2ImgSection />

        <AdvancedFields form={form} descriptor={descriptor} />

        <SubmitBar descriptor={descriptor} isPending={submit.isPending} />
      </form>
    </Form>
  );
}

function VariantsField() {
  const t = useTranslations();
  return (
    <Controller<ImageFormValues, "ui.variants">
      name="ui.variants"
      render={({ field }) => {
        const variants = clampVariants(field.value);
        return (
          <FormItem>
            <FormLabel>{t("IMAGE.VARIANTS_LABEL")}</FormLabel>
            <div className="flex gap-2">
              {VARIANT_CHOICES.map((n) => (
                <Button
                  key={n}
                  type="button"
                  variant={variants === n ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => field.onChange(n)}
                >
                  {n}
                </Button>
              ))}
            </div>
          </FormItem>
        );
      }}
    />
  );
}
