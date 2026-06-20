"use client";

import dynamic from "next/dynamic";
import { Icon } from "@/components/ui/icon";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useSubmitGenerationMutation } from "@/hooks/ai/playground-hook";
import { useUploadMaskMutation } from "@/hooks/ai/playground-hook";
import { useLocale, useTranslations } from "next-intl";
import { dollarsToQuota, renderQuota } from "@/lib/config/constants";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import type { RestoredFromPng } from "@/components/pages/sidebar/playground/utils/png-metadata";
import type { GenerationMode } from "@/lib/validation/playground";
import {
  activeSessionIdAtom,
  activeSnapshotIdAtom,
  activeSubPillAtom,
  activeTabAtom,
} from "@/store/playground-store";
import { useAtom, useAtomValue } from "jotai";
import { AspectRatioField } from "../fields/aspect-ratio-field";
import { InitImageField } from "../fields/init-image-field";
// react-canvas-masker is a UMD bundle referencing self; SSR 500s, so load client-only on first inpaint render.
const InpaintCanvas = dynamic(
  () => import("../fields/inpaint-canvas").then((m) => m.InpaintCanvas),
  { ssr: false },
);
import { LoraPicker } from "../fields/lora-picker";
import { ReferenceUploader } from "../fields/reference-uploader";
import { INITIAL_MODEL, VARIANT_CHOICES } from "../playground-constants";
import { AdvancedFieldsStack } from "./advanced-fields-stack";
import { CoreParamsFields } from "./core-params-fields";
import { patchParams } from "./form-helpers";
import { ModelPicker } from "./model-picker";
import { TokenEstimate } from "./playground-form-fields";
import { PngImport } from "./png-import";
import { toSubmitBody } from "./submit-transform";
import { useGenerationForm } from "./use-generation-form";
import { VendorParamsFields } from "./vendor-params-fields";

function deriveMode(
  activeTab: "text2img" | "img2img" | "edit",
  activeSubPill: "img2img" | "upscale" | "adetailer" | "inpaint",
): GenerationMode {
  if (activeTab === "text2img") return "txt2img";
  if (activeTab === "edit") return "edit";
  return activeSubPill;
}

export function GenerateForm() {
  const t = useTranslations();
  const locale = useLocale();
  const submitMut = useSubmitGenerationMutation();
  const uploadMaskMut = useUploadMaskMutation();
  const activeTab = useAtomValue(activeTabAtom);
  const activeSubPill = useAtomValue(activeSubPillAtom);
  const [activeSessionId, setActiveSessionId] = useAtom(activeSessionIdAtom);
  const [, setActiveSnapshotId] = useAtom(activeSnapshotIdAtom);

  const gen = useGenerationForm();
  const form = gen.form;
  const descriptor = gen.descriptor;

  const ui = form.watch("ui") ?? {};
  const variantsRaw = ui.variants;
  const variants =
    typeof variantsRaw === "number" && [1, 2, 4].includes(variantsRaw)
      ? (variantsRaw as 1 | 2 | 4)
      : 1;
  const totalQuota = dollarsToQuota(descriptor.pricePerCall * variants);
  const params = form.watch("params") ?? {};

  const onPngImport = (data: RestoredFromPng) => {
    if (data.prompt !== undefined) {
      form.setValue("prompt", data.prompt, { shouldDirty: true });
    }
    if (data.negativePrompt !== undefined) {
      form.setValue("negativePrompt", data.negativePrompt, {
        shouldDirty: true,
      });
    }
    patchParams(form, {
      ...(data.seed !== undefined && { seed: data.seed }),
      ...(data.steps !== undefined && { steps: data.steps }),
      ...(data.cfg !== undefined && { cfg: data.cfg }),
      ...(data.guidance !== undefined && { guidance: data.guidance }),
      ...(data.sampler !== undefined && { sampler: data.sampler }),
      ...(data.scheduler !== undefined && { scheduler: data.scheduler }),
      ...(data.width !== undefined && { width: data.width }),
      ...(data.height !== undefined && { height: data.height }),
    });
  };

  const onSubmit = form.handleSubmit(async (data) => {
    const mode = deriveMode(activeTab, activeSubPill);
    const body = await toSubmitBody(data, {
      activeSessionId,
      mode,
      uploadMaskAsync: (file) => uploadMaskMut.mutateAsync(file),
    });
    const submitted = await submitMut.mutateAsync({
      ...body,
      sessionId: activeSessionId ?? undefined,
    });

    if (mode === "inpaint") {
      const curUi = data.ui ?? {};
      form.setValue("ui", { ...curUi, inpaintMaskDataUrl: undefined });
    }

    const modelKey = data.model ?? INITIAL_MODEL;
    gen.setSamplerMemory({
      ...gen.samplerMemory,
      [modelKey]: data.params ?? {},
    });
    gen.setDraft(null);

    setActiveSessionId(submitted.sessionId);
    setActiveSnapshotId(submitted.snapshotId);
    window.history.replaceState(
      null,
      "",
      `/${locale}/playground/${submitted.sessionId}?snap=${submitted.snapshotId}`,
    );
  });

  const setVariants = (n: 1 | 2 | 4) => {
    form.setValue("ui", { ...ui, variants: n });
  };

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="flex flex-col gap-6">
        <PngImport onImport={onPngImport} />

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
                  activeTab={activeTab}
                  onSelect={(id) => {
                    field.onChange(id);
                    gen.changeModel(id);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {descriptor.supportsSize && (
          <AspectRatioField
            width={(params.width as number | undefined) ?? 1024}
            height={(params.height as number | undefined) ?? 1024}
            onChange={(next) =>
              patchParams(form, { width: next.width, height: next.height })
            }
          />
        )}

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
                onClick={() => setVariants(n)}
              >
                {n}
              </Button>
            ))}
          </div>
        </FormItem>

        {descriptor.supportsLoraChain && (
          <LoraPicker
            family={descriptor.family}
            value={form.watch("loras") ?? []}
            onChange={(loras) =>
              form.setValue("loras", loras.length > 0 ? loras : undefined, {
                shouldDirty: true,
              })
            }
          />
        )}

        {descriptor.supportsReferences && (
          <ReferenceUploader
            maxFiles={descriptor.maxReferenceImages}
            value={form.watch("references") ?? []}
            onChange={(refs) =>
              form.setValue("references", refs.length > 0 ? refs : undefined, {
                shouldDirty: true,
              })
            }
          />
        )}

        <VendorParamsFields form={form} descriptor={descriptor} />

        {activeTab === "img2img" && (
          <InitImageField
            value={params.initImageUrl as string | undefined}
            onChange={(initImageUrl) => patchParams(form, { initImageUrl })}
          />
        )}

        {activeTab === "img2img" &&
          activeSubPill === "inpaint" &&
          typeof params.initImageUrl === "string" && (
            <InpaintCanvas imageUrl={params.initImageUrl} />
          )}

        <AdvancedFieldsStack form={form} descriptor={descriptor} />

        <div className="flex flex-col gap-2">
          <Button
            type="submit"
            disabled={submitMut.isPending || !(form.watch("prompt") ?? "")}
            size="lg"
          >
            <Icon name="sparkles" className="mr-2" />
            {submitMut.isPending
              ? t("IMAGE.SUBMITTING")
              : `${t("IMAGE.SUBMIT")} - ${renderQuota(totalQuota, 2)}`}
          </Button>
          {activeSessionId && (
            <Link
              href="/playground"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              {t("IMAGE.NEW_SESSION")}
            </Link>
          )}
        </div>
      </form>
    </Form>
  );
}
