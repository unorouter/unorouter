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
import { estimateImageCost, willClamp } from "@/lib/ai/image/cost-estimate";
import { COST_FLOOR_FALLBACK, COST_MARKUP } from "@/lib/ai/image/constants";
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
import { InpaintSettings } from "../fields/inpaint-settings";
import { LoraPicker } from "../fields/lora-picker";
import { ReferenceUploader } from "../fields/reference-uploader";
import {
  clampVariants,
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
import { IMAGE_URL_PARSERS } from "../image-url-state";
import { useQueryStates } from "nuqs";

// react-canvas-masker touches the DOM at module scope, so the canvas cannot render on
// the server and is only pulled in when the inpaint mode is actually opened.
const InpaintCanvas = dynamic(
  () => import("../fields/inpaint-canvas").then((m) => m.InpaintCanvas),
  { ssr: false },
);

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
  const [activeSubPill, setActiveSubPill] = useAtom(activeSubPillAtom);
  const [, setImageUrlState] = useQueryStates(IMAGE_URL_PARSERS);
  const [activeSessionId, setActiveSessionId] = useAtom(activeSessionIdAtom);
  const [, setActiveSnapshotId] = useAtom(activeSnapshotIdAtom);

  const gen = useGenerationForm();
  const form = gen.form;
  const descriptor = gen.descriptor;

  const ui = form.watch("ui") ?? {};
  // Derived, not synced: ui.air (restored from a snapshot's extraParams) IS the
  // selection; a checkpoint picked this session takes precedence.
  const activeCheckpoint: CustomCheckpoint | null =
    pickedCheckpoint ??
    (ui.air
      ? {
          air: ui.air,
          name: ui.airName ?? ui.air,
          architecture: ui.airArchitecture ?? null,
          heroImage: null,
          nsfwLevel: null,
        }
      : null);
  const variants = clampVariants(ui.variants);
  const params = form.watch("params") ?? {};

  const cost = estimateImageCost({
    width: params.width ?? 1024,
    height: params.height ?? 1024,
    count: variants,
    markup: COST_MARKUP,
    floorPrice: descriptor.pricePerCall || COST_FLOOR_FALLBACK,
  });
  const priceLabel = descriptor.isFree
    ? t("IMAGE.FREE_BADGE")
    : `~${renderQuota(dollarsToQuota(cost.estimate), 2)}`;
  const clampWarning = willClamp(
    params.width ?? 1024,
    params.height ?? 1024,
    params.steps ?? 0,
  );

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
              // Name persisted so history shows the checkpoint, not the routing id.
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
    // The draft is the whole setup and survives the submit; the checkpoint rides in ui
    // because submitting navigates and remounts the form, dropping component state.
    const draftUi = {
      ...(data.ui ?? { variants: 1 }),
      ...(activeCheckpoint
        ? {
            air: activeCheckpoint.air,
            airName: activeCheckpoint.name,
            ...(activeCheckpoint.architecture
              ? { airArchitecture: activeCheckpoint.architecture }
              : {}),
          }
        : {}),
    };
    gen.setDraft({
      model: modelKey,
      prompt: data.prompt ?? "",
      negativePrompt: data.negativePrompt ?? "",
      params: data.params ?? {},
      loras: data.loras,
      references: data.references,
      extraParams: draftUi,
    });
    form.setValue("ui", draftUi);

    setActiveSessionId(submitted.sessionId);
    setActiveSnapshotId(submitted.snapshotId);
    // replace: a submit must not add a back entry between the form and its own result.
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
            gen.adoptModelTab(preset.model);
            form.setValue("model", preset.model);
            gen.changeModel(preset.model);
            // Only a preset carrying its own checkpoint replaces the resolved one.
            if (preset.extraParams?.air) setPickedCheckpoint(null);
            // The positive prompt is never applied (it is what the user is writing);
            // the negative prompt is the boilerplate a preset exists to carry.
            form.setValue("negativePrompt", preset.negativePrompt ?? "");
            if (preset.params) form.setValue("params", preset.params);
            form.setValue("loras", preset.loras ?? undefined);
            // Merge: a preset with no checkpoint must not drop the current ui's AIR.
            if (preset.extraParams) {
              form.setValue("ui", {
                ...(preset.extraParams.air ? {} : ui),
                ...preset.extraParams,
              });
            }
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
            // Mirrored into ui: the draft is built from ui, and component state dies on
            // the post-submit remount.
            onChange={(next) => {
              setPickedCheckpoint(next);
              const current = form.getValues("ui") ?? {};
              form.setValue(
                "ui",
                next
                  ? {
                      ...current,
                      air: next.air,
                      airName: next.name,
                      ...(next.architecture
                        ? { airArchitecture: next.architecture }
                        : {}),
                    }
                  : {
                      ...current,
                      air: undefined,
                      airName: undefined,
                      airArchitecture: undefined,
                    },
              );
            }}
            query={ui.airQuery ?? ""}
            onQueryChange={(next) =>
              form.setValue("ui", {
                ...(form.getValues("ui") ?? {}),
                airQuery: next,
              })
            }
          />
        )}

        {descriptor.supportsSize && (
          <AspectRatioField
            width={params.width ?? 1024}
            height={params.height ?? 1024}
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
            value={params.initImageUrl}
            onChange={(initImageUrl) => patchParams(form, { initImageUrl })}
            onInpaint={
              activeSubPill === "inpaint"
                ? undefined
                : () => {
                    setActiveSubPill("inpaint");
                    void setImageUrlState({ mode: "inpaint" });
                  }
            }
          />
        )}

        {activeTab === "img2img" &&
          activeSubPill === "inpaint" &&
          typeof params.initImageUrl === "string" && (
            <>
              <InpaintCanvas imageUrl={params.initImageUrl} />
              <InpaintSettings fallbackPrompt={form.watch("prompt") ?? ""} />
            </>
          )}

        <AdvancedFieldsStack form={form} descriptor={descriptor} />

        {/* Sticky: the result mounting above pushes this below the fold mid-run. */}
        <div className="bg-background sticky bottom-0 z-10 flex flex-col gap-2 py-2">
          <Button
            type="submit"
            // Inpainting has its own prompt; either one describes what to generate.
            disabled={
              submitMut.isPending ||
              !((form.watch("prompt") || ui.inpaintPrompt) ?? "")
            }
            size="lg"
          >
            <Icon
              name={submitMut.isPending ? "loader" : "sparkles"}
              className={cn("mr-2", submitMut.isPending && "animate-spin")}
            />
            {submitMut.isPending
              ? t("IMAGE.SUBMITTING")
              : `${t("IMAGE.SUBMIT")} ${priceLabel}`}
          </Button>
          {/* A disabled button with no stated reason reads as broken. */}
          {!submitMut.isPending && !(form.watch("prompt") ?? "") && (
            <p className="text-muted-foreground text-xs">
              {t("IMAGE.SUBMIT_NEEDS_PROMPT")}
            </p>
          )}
          {clampWarning && (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              {t("IMAGE.CLAMP_WARNING")}
            </p>
          )}
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
