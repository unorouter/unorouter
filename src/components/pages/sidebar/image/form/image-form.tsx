"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
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
import { useSubmitGenerationMutation } from "@/hooks/ai/image-hook";
import { useRememberImageModelMutation } from "@/hooks/ai/image-catalog-hook";
import { useTranslations } from "next-intl";
import { estimateImageCost } from "@/lib/ai/image/cost-estimate";
import { dollarsToQuota, renderQuota } from "@/lib/config/constants";
import { cn } from "@/lib/utils";
import { Link, useRouter } from "@/i18n/navigation";
import type { RestoredFromPng } from "@/components/pages/sidebar/image/utils/png-metadata";
import type { GenerationMode } from "@/lib/validation/playground";
import {
  activeSessionIdAtom,
  activeSnapshotIdAtom,
  activeSubPillAtom,
  activeTabAtom,
} from "@/store/image-store";
import { useAtom, useAtomValue } from "jotai";
import { AspectRatioField } from "../fields/aspect-ratio-field";
import { CivitaiResolverField } from "../fields/civitai-resolver-field";
import { InitImageField } from "../fields/init-image-field";
import { LoraPicker } from "../fields/lora-picker";
import { ReferenceUploader } from "../fields/reference-uploader";
import {
  CUSTOM_CIVITAI_MODEL_ID,
  INITIAL_MODEL,
  VARIANT_CHOICES,
} from "../image-constants";
import { AdvancedFieldsStack } from "./advanced-fields-stack";
import { CoreParamsFields } from "./core-params-fields";
import { patchParams } from "./form-helpers";
import { ModelPicker, type CustomCheckpoint } from "./model-picker";
import { PresetBar } from "./preset-bar";
import { TokenEstimate } from "./image-form-fields";
import { PngImport } from "./png-import";
import { toSubmitBody } from "./submit-transform";
import { useGenerationForm } from "./use-generation-form";
import { VendorParamsFields } from "./vendor-params-fields";

// react-canvas-masker touches the DOM at module scope, so the canvas cannot render on
// the server and is only pulled in when the inpaint mode is actually opened.
const InpaintCanvas = dynamic(
  () => import("../fields/inpaint-canvas").then((m) => m.InpaintCanvas),
  { ssr: false },
);

const COST_MARKUP = 20;
const COST_FLOOR_FALLBACK = 0.02;

function deriveMode(
  activeTab: "text2img" | "img2img" | "edit",
  activeSubPill: "img2img" | "upscale" | "adetailer" | "inpaint",
): GenerationMode {
  if (activeTab === "text2img") return "txt2img";
  if (activeTab === "edit") return "edit";
  return activeSubPill;
}

export function ImageForm() {
  const t = useTranslations();
  const router = useRouter();
  const [pickedCheckpoint, setPickedCheckpoint] =
    useState<CustomCheckpoint | null>(null);
  const rememberModel = useRememberImageModelMutation();
  const submitMut = useSubmitGenerationMutation();
  const activeTab = useAtomValue(activeTabAtom);
  const activeSubPill = useAtomValue(activeSubPillAtom);
  const [activeSessionId, setActiveSessionId] = useAtom(activeSessionIdAtom);
  const [, setActiveSnapshotId] = useAtom(activeSnapshotIdAtom);

  const gen = useGenerationForm();
  const form = gen.form;
  const descriptor = gen.descriptor;

  const ui = form.watch("ui") ?? {};
  // A restored snapshot repopulates ui from its extraParams, which is where the checkpoint
  // was recorded. Re-selecting it here keeps the picker label right and, more importantly,
  // keeps the AIR on a resubmit instead of silently generating with the placeholder model.
  // Derived, not synced: a restored snapshot repopulates ui from its extraParams, so the
  // checkpoint recorded there IS the selection. Picking one in the session takes precedence
  // over what an older snapshot restored.
  const restoredAir = (ui as Record<string, unknown>).air;
  const restoredAirName = (ui as Record<string, unknown>).airName;
  const activeCheckpoint: CustomCheckpoint | null =
    pickedCheckpoint ??
    (typeof restoredAir === "string" && restoredAir
      ? {
          air: restoredAir,
          name:
            typeof restoredAirName === "string" ? restoredAirName : restoredAir,
          architecture: null,
          heroImage: null,
          nsfwLevel: null,
        }
      : null);
  const variantsRaw = ui.variants;
  const variants = ([1, 2, 4] as const).find((v) => v === variantsRaw) ?? 1;
  const params = form.watch("params") ?? {};

  const cost = estimateImageCost({
    width: (params.width as number | undefined) ?? 1024,
    height: (params.height as number | undefined) ?? 1024,
    count: variants,
    markup: COST_MARKUP,
    floorPrice: descriptor.pricePerCall || COST_FLOOR_FALLBACK,
  });
  const priceLabel = descriptor.isFree
    ? t("IMAGE.FREE_BADGE")
    : `~${renderQuota(dollarsToQuota(cost.estimate), 2)}`;

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
    const body = await toSubmitBody(data, { activeSessionId, mode });
    const submitted = await submitMut.mutateAsync({
      ...body,
      ...(activeCheckpoint
        ? {
            extraParams: {
              ...(body.extraParams ?? {}),
              air: activeCheckpoint.air,
              // Persisted so history reads as the checkpoint the user chose rather than
              // the routing id, and so reopening the snapshot can restore it.
              airName: activeCheckpoint.name,
              ...(activeCheckpoint.architecture
                ? { airArchitecture: activeCheckpoint.architecture }
                : {}),
            },
          }
        : {}),
      sessionId: activeSessionId ?? undefined,
    });

    // Saved only once it has produced an image, so the list is checkpoints actually used.
    if (activeCheckpoint) rememberModel.mutate(activeCheckpoint);

    if (mode === "inpaint") {
      const curUi = data.ui ?? {};
      form.setValue("ui", { ...curUi, inpaintMaskDataUrl: undefined });
    }

    const modelKey = data.model ?? INITIAL_MODEL;
    gen.setSamplerMemory({
      ...gen.samplerMemory,
      [modelKey]: data.params ?? {},
    });
    // The draft is the whole setup, not an unsent message: clearing it on success threw
    // away the model and every setting, so the next visit started from defaults. The prompt
    // is kept too - a generation is usually the first of several on the same prompt, and
    // blanking the stored copy wiped what the form was still showing on the next restore.
    gen.setDraft({
      model: modelKey,
      prompt: data.prompt ?? "",
      negativePrompt: data.negativePrompt ?? "",
      params: data.params ?? {},
      loras: data.loras,
      references: data.references,
      extraParams: data.ui ?? { variants: 1 },
    });

    setActiveSessionId(submitted.sessionId);
    setActiveSnapshotId(submitted.snapshotId);
    // Through the i18n router so the locale-translated pathname is used, and replace so a
    // submit does not add a back entry between the form and its own result.
    router.replace(
      {
        pathname: "/image/[id]",
        params: { id: submitted.sessionId },
        query: { snap: submitted.snapshotId },
      },
      { scroll: false },
    );
  });

  const setVariants = (n: 1 | 2 | 4) => {
    form.setValue("ui", { ...ui, variants: n });
  };

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="flex flex-col gap-6">
        <PngImport onImport={onPngImport} />

        <PresetBar
          current={{
            model: form.watch("model") ?? INITIAL_MODEL,
            negativePrompt: form.watch("negativePrompt"),
            params: form.watch("params"),
            loras: form.watch("loras"),
            extraParams: form.watch("ui"),
          }}
          onApply={(preset) => {
            // The prompt is intentionally untouched: a preset restores the setup around
            // whatever the user is currently writing.
            form.setValue("model", preset.model);
            gen.changeModel(preset.model);
            setPickedCheckpoint(null);
            form.setValue("negativePrompt", preset.negativePrompt ?? "");
            if (preset.params) form.setValue("params", preset.params);
            form.setValue("loras", preset.loras ?? undefined);
            if (preset.extraParams) form.setValue("ui", preset.extraParams);
          }}
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
                  activeTab={activeTab}
                  onSelect={(id) => {
                    field.onChange(id);
                    gen.changeModel(id);
                    setPickedCheckpoint(null);
                  }}
                  onSelectCustom={(checkpoint) => {
                    // The passthrough model carries no checkpoint of its own; the AIR rides
                    // on the request and the picker label shows the resolved name.
                    field.onChange(CUSTOM_CIVITAI_MODEL_ID);
                    gen.changeModel(CUSTOM_CIVITAI_MODEL_ID);
                    setPickedCheckpoint(checkpoint);
                  }}
                  customLabel={activeCheckpoint?.name ?? null}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {descriptor.id === CUSTOM_CIVITAI_MODEL_ID && (
          <CivitaiResolverField
            value={activeCheckpoint}
            onChange={setPickedCheckpoint}
          />
        )}

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
              : `${t("IMAGE.SUBMIT")} ${priceLabel}`}
          </Button>
          {activeSessionId && (
            <Link
              href="/image"
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
