"use client";

import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import { Icon } from "@/components/ui/icon";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuthQuery } from "@/hooks/auth-hook";
import {
  useSnapshotQuery,
  useSubmitGenerationMutation,
  useUploadMaskMutation,
} from "@/hooks/playground-hook";
import { usePricingQuery } from "@/hooks/pricing-hook";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import {
  AUTH_REDIRECT_COOKIE,
  dollarsToQuota,
  renderQuota,
} from "@/lib/config/constants";
import {
  getModelDescriptor,
  type PlaygroundModelDescriptor,
} from "@/lib/playground/models";
import { getEffectiveGenerationModels } from "@/lib/playground/models-dynamic";
import { cn } from "@/lib/utils";
import type { RestoredFromPng } from "@/components/pages/sidebar/playground/utils/png-metadata";
import {
  generationFormValues,
  type GenerationFormValues,
  type GenerationMode,
  type PlaygroundModel,
} from "@/lib/validation/playground";
import {
  activeSessionIdAtom,
  activeSnapshotIdAtom,
  activeSubPillAtom,
  activeTabAtom,
  editDraftAtom,
  img2imgDraftAtom,
  restoreSnapshotIntoFormAtom,
  samplerMemoryAtom,
  text2imgDraftAtom,
  type GenerateDraft,
  type GenerateTab,
} from "@/store/playground-store";
import { typeboxResolver } from "@hookform/resolvers/typebox";
import { setCookie } from "cookies-next";
import { useAtom, useAtomValue } from "jotai";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import {
  AdetailerSection,
  type AdetailerValue,
} from "../fields/adetailer-section";
import { AdvancedSettingsAccordion } from "../fields/advanced-settings-accordion";
import { AspectRatioField } from "../fields/aspect-ratio-field";
import {
  ControlNetModal,
  type ControlNetValue,
} from "../fields/controlnet-modal";
import type { EmbeddingEntry } from "../fields/embedding-picker";
import { EmbeddingPicker } from "../fields/embedding-picker";
import { InitImageField } from "../fields/init-image-field";
import { InpaintCanvas } from "../fields/inpaint-canvas";
import { LayerDiffusionField } from "../fields/layer-diffusion-field";
import type { LoraEntry } from "../fields/lora-picker";
import { LoraPicker } from "../fields/lora-picker";
import type { ReferenceEntry } from "../fields/reference-uploader";
import { ReferenceUploader } from "../fields/reference-uploader";
import { UpscalerField } from "../fields/upscaler-field";
import { VaePicker } from "../fields/vae-picker";
import { INITIAL_MODEL, VARIANT_CHOICES } from "../playground-constants";
import {
  OutputFormatField,
  QualityField,
  SeedField,
  SliderWithInput,
  TokenEstimate,
} from "./playground-form-fields";
import { PngImport } from "./png-import";
import { toSubmitBody } from "./submit-transform";

function isModelInTab(m: PlaygroundModelDescriptor, tab: GenerateTab): boolean {
  if (!m.tabs) return tab === "text2img";
  return m.tabs.includes(tab);
}

function defaultsFor(d: PlaygroundModelDescriptor): GenerationFormValues {
  return {
    model: d.id,
    prompt: "",
    negativePrompt: "",
    params: { ...d.defaultParams },
    visibility: "private",
    nsfw: d.nsfwDefault,
    ui: { variants: 1 },
  } as GenerationFormValues;
}

function deriveMode(
  activeTab: GenerateTab,
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
  const activeTab = useAtomValue(activeTabAtom);
  const activeSubPill = useAtomValue(activeSubPillAtom);
  const uploadMaskMut = useUploadMaskMutation();
  const searchParams = useSearchParams();
  const [activeSessionId, setActiveSessionId] = useAtom(activeSessionIdAtom);
  const [activeSnapshotId, setActiveSnapshotId] = useAtom(activeSnapshotIdAtom);
  const [restorePayload, setRestorePayload] = useAtom(
    restoreSnapshotIntoFormAtom,
  );
  const tabDraftAtom = (() => {
    switch (activeTab as GenerateTab) {
      case "img2img":
        return img2imgDraftAtom;
      case "edit":
        return editDraftAtom;
      default:
        return text2imgDraftAtom;
    }
  })();
  const [draft, setDraft] = useAtom(tabDraftAtom);
  const [samplerMemory, setSamplerMemory] = useAtom(samplerMemoryAtom);
  const remixId = searchParams.get("remix");
  const hiresShortcut = searchParams.get("hires") === "1";
  const seedSourceId = remixId;
  const seedQuery = useSnapshotQuery(seedSourceId);

  const pricingQuery = usePricingQuery();
  const effectiveModels = getEffectiveGenerationModels(
    pricingQuery.data?.models,
  );
  const findDescriptor = (id: PlaygroundModel): PlaygroundModelDescriptor =>
    effectiveModels.find((m) => m.id === id) ?? getModelDescriptor(id);
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const authQuery = useAuthQuery();
  const isLoggedIn = !!authQuery.data;
  const router = useRouter();
  const pathname = usePathname();

  const form = useForm<GenerationFormValues>({
    resolver: typeboxResolver(generationFormValues),
    defaultValues: defaultsFor(
      getModelDescriptor(INITIAL_MODEL),
    ) as GenerationFormValues,
  });

  const selectedModel =
    (form.watch("model") as PlaygroundModel | undefined) ?? INITIAL_MODEL;
  const descriptor = findDescriptor(selectedModel);

  const ui = form.watch("ui") ?? {};
  const variantsRaw = ui.variants;
  const variants =
    typeof variantsRaw === "number" && [1, 2, 4].includes(variantsRaw)
      ? (variantsRaw as 1 | 2 | 4)
      : 1;
  const totalQuota = dollarsToQuota(descriptor.pricePerCall * variants);

  // Mirror tab + sub-pill into the form's `mode` so the resolver and any
  // mode-aware children see the canonical value, not just the atoms.
  useEffect(() => {
    form.setValue("mode", deriveMode(activeTab, activeSubPill));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, activeSubPill]);

  const handleModelChange = (next: string) => {
    const nextModel = next as PlaygroundModel;
    const nextDesc = findDescriptor(nextModel);
    form.setValue("model", nextModel);
    const remembered = samplerMemory[nextModel];
    const params = remembered
      ? { ...nextDesc.defaultParams, ...remembered }
      : { ...nextDesc.defaultParams };
    form.setValue("params", params as never, { shouldDirty: true });
    if (!nextDesc.supportsNegativePrompt) form.setValue("negativePrompt", "");
    if (!nextDesc.supportsReferences) form.setValue("references", undefined);
    if (!nextDesc.supportsLoraChain) form.setValue("loras", undefined);
    form.setValue("nsfw", nextDesc.nsfwDefault, { shouldDirty: true });
  };

  const seededIdRef = useRef<string | null>(null);
  useEffect(() => {
    const data = seedQuery.data;
    if (!data) return;
    if (seededIdRef.current === data.id) return;
    seededIdRef.current = data.id;

    const model = data.model as PlaygroundModel;
    const desc = findDescriptor(model);
    const hiresParams =
      hiresShortcut && desc.supportsHiresFix
        ? { hiresDenoise: 0.5, hiresUpscale: 1.5 }
        : {};
    form.reset({
      ...defaultsFor(desc),
      prompt: data.prompt,
      negativePrompt: data.negativePrompt ?? "",
      params: {
        ...desc.defaultParams,
        ...((data.params as Record<string, unknown> | null) ?? {}),
        ...hiresParams,
      },
      loras: (data.loras as LoraEntry[] | null) ?? undefined,
      references: (data.references as { url: string }[] | null) ?? undefined,
      visibility: "private",
      nsfw: data.nsfw ?? true,
      ui: { variants: 1 },
    } as GenerationFormValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedQuery.data, form]);

  useEffect(() => {
    if (effectiveModels.length === 0) return;
    const current = form.watch("model") ?? "";
    const desc = effectiveModels.find((m) => m.id === current);
    if (desc && (isLoggedIn || desc.isFree)) return;
    const freePool = effectiveModels.filter((m) => m.isFree);
    if (freePool.length === 0) return;
    handleModelChange(freePool[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, effectiveModels.length]);

  useEffect(() => {
    if (effectiveModels.length === 0) return;
    const current = form.watch("model") ?? "";
    const desc = effectiveModels.find((m) => m.id === current);
    if (desc && isModelInTab(desc, activeTab)) return;
    const pool = effectiveModels.filter((m) => isModelInTab(m, activeTab));
    if (pool.length === 0) return;
    handleModelChange(pool[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, effectiveModels.length]);

  const draftRestoredRef = useRef<string | null>(null);
  useEffect(() => {
    if (draftRestoredRef.current === activeTab) return;
    if (seedSourceId) return;
    draftRestoredRef.current = activeTab;
    if (!draft) {
      const fallback =
        effectiveModels.find((m) => isModelInTab(m, activeTab)) ??
        getModelDescriptor(INITIAL_MODEL);
      form.reset(defaultsFor(fallback));
      return;
    }
    form.reset({
      ...defaultsFor(
        getModelDescriptor((draft.model as PlaygroundModel) || INITIAL_MODEL),
      ),
      model: draft.model as PlaygroundModel,
      prompt: draft.prompt,
      negativePrompt: draft.negativePrompt ?? "",
      params: draft.params as never,
      loras: draft.loras as never,
      references: draft.references as never,
      nsfw: draft.nsfw,
      ui: (draft.extraParams as { variants?: number } | undefined) ?? {
        variants: 1,
      },
    } as GenerationFormValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, seedSourceId, draft, form]);

  const setDraftRef = useRef(setDraft);
  useEffect(() => {
    setDraftRef.current = setDraft;
  }, [setDraft]);
  useEffect(() => {
    const subscription = form.watch((values) => {
      const timer = setTimeout(() => {
        const next: GenerateDraft = {
          model: (values.model as string) ?? INITIAL_MODEL,
          prompt: (values.prompt as string) ?? "",
          negativePrompt: (values.negativePrompt as string) ?? "",
          params: (values.params as Record<string, unknown>) ?? {},
          loras: values.loras,
          references: values.references,
          nsfw: (values.nsfw as boolean) ?? true,
          extraParams: (values.ui as Record<string, unknown>) ?? {
            variants: 1,
          },
        };
        setDraftRef.current(next);
      }, 500);
      return () => clearTimeout(timer);
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  const onPngImport = (data: RestoredFromPng) => {
    if (data.prompt !== undefined) {
      form.setValue("prompt", data.prompt, { shouldDirty: true });
    }
    if (data.negativePrompt !== undefined) {
      form.setValue("negativePrompt", data.negativePrompt, {
        shouldDirty: true,
      });
    }
    const cur =
      form.watch("params") ?? {};
    const next: Record<string, unknown> = { ...cur };
    if (data.seed !== undefined) next.seed = data.seed;
    if (data.steps !== undefined) next.steps = data.steps;
    if (data.cfg !== undefined) next.cfg = data.cfg;
    if (data.guidance !== undefined) next.guidance = data.guidance;
    if (data.sampler !== undefined) next.sampler = data.sampler;
    if (data.scheduler !== undefined) next.scheduler = data.scheduler;
    if (data.width !== undefined) next.width = data.width;
    if (data.height !== undefined) next.height = data.height;
    form.setValue("params", next as never, { shouldDirty: true });
  };

  const onSubmit = form.handleSubmit(async (data) => {
    const mode = deriveMode(activeTab, activeSubPill);
    const body = await toSubmitBody(data as GenerationFormValues, {
      activeSessionId,
      mode,
      uploadMaskAsync: (file) => uploadMaskMut.mutateAsync(file),
    });
    const submitted = await submitMut.mutateAsync({ body });

    if (mode === "inpaint") {
      const curUi = (data.ui as Record<string, unknown> | undefined) ?? {};
      form.setValue("ui", { ...curUi, inpaintMaskDataUrl: undefined } as never);
    }

    const modelKey = (data.model as string) ?? INITIAL_MODEL;
    setSamplerMemory({
      ...samplerMemory,
      [modelKey]: (data.params as Record<string, unknown> | undefined) ?? {},
    });
    setDraft(null);

    setActiveSessionId(submitted.session.id);
    setActiveSnapshotId(submitted.snapshot.id);
    window.history.replaceState(
      null,
      "",
      `/${locale}/generate/${submitted.session.id}?snap=${submitted.snapshot.id}`,
    );
  });

  useEffect(() => {
    if (!restorePayload) return;
    const modelId = (restorePayload.model as PlaygroundModel) ?? INITIAL_MODEL;
    const desc = findDescriptor(modelId);
    const mergedParams: Record<string, unknown> = {
      ...desc.defaultParams,
      ...(restorePayload.params ?? {}),
    };
    if (restorePayload.initImageUrl) {
      mergedParams.initImageUrl = restorePayload.initImageUrl;
    }
    form.reset({
      ...defaultsFor(desc),
      model: modelId,
      prompt: restorePayload.prompt,
      negativePrompt: restorePayload.negativePrompt ?? "",
      params: mergedParams as never,
      loras: (restorePayload.loras as LoraEntry[] | null) ?? undefined,
      references:
        (restorePayload.references as { url: string }[] | null) ?? undefined,
      nsfw: restorePayload.nsfw,
      ui: (restorePayload.extraParams as { variants?: number } | undefined) ?? {
        variants: 1,
      },
    } as GenerationFormValues);
    setRestorePayload(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restorePayload]);

  void activeSnapshotId;

  const numParam = (
    key: "steps" | "cfg" | "guidance" | "seed",
    fallback?: number,
  ): number | undefined => {
    const params = form.watch("params") as
      | Record<string, number | undefined>
      | undefined;
    return params?.[key] ?? fallback;
  };

  const setVariants = (n: 1 | 2 | 4) => {
    form.setValue("ui", { ...ui, variants: n } as never);
  };

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="flex flex-col gap-6">
        <PngImport onImport={onPngImport} />

        <div>
          <FormField
            control={form.control}
            name="model"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("IMAGE.MODEL_LABEL")}</FormLabel>
                <FormControl>
                  <Popover
                    open={modelPickerOpen}
                    onOpenChange={setModelPickerOpen}
                  >
                    <PopoverTrigger className="border-input bg-background ring-offset-background hover:bg-accent hover:text-accent-foreground flex h-9 w-full items-center justify-between rounded-md border px-3 text-sm">
                      <span className="flex min-w-0 items-center gap-2">
                        {descriptor.vendor && (
                          <VendorIcon vendor={descriptor.vendor} size={16} />
                        )}
                        <span className="truncate">
                          {descriptor.displayName}
                        </span>
                      </span>
                      <Icon
                        name="chevrons-up-down"
                        className="text-muted-foreground ml-2 h-4 w-4 shrink-0"
                      />
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-[--radix-popover-trigger-width] p-0"
                      align="start"
                    >
                      <Command>
                        <CommandInput placeholder={t("IMAGE.MODEL_SEARCH")} />
                        <CommandList>
                          <CommandEmpty>
                            {t("IMAGE.MODEL_NO_RESULTS")}
                          </CommandEmpty>
                          <CommandGroup
                            heading={t("IMAGE.MODEL_GROUP_COMFYUI")}
                          >
                            {effectiveModels
                              .filter((m) => m.family !== "sync-image")
                              .filter((m) => isModelInTab(m, activeTab))
                              .map((m) => {
                                const disabled = !isLoggedIn && !m.isFree;
                                return (
                                  <CommandItem
                                    key={m.id}
                                    value={`${m.displayName} ${m.id}`}
                                    onSelect={() => {
                                      if (disabled) {
                                        setCookie(
                                          AUTH_REDIRECT_COOKIE,
                                          pathname,
                                          { maxAge: 300 },
                                        );
                                        router.push("/login");
                                        setModelPickerOpen(false);
                                        return;
                                      }
                                      field.onChange(m.id);
                                      handleModelChange(m.id);
                                      setModelPickerOpen(false);
                                    }}
                                    className={cn(disabled && "opacity-50")}
                                  >
                                    {m.vendor && (
                                      <VendorIcon vendor={m.vendor} size={14} />
                                    )}
                                    <span className="min-w-0 flex-1 truncate">
                                      {m.displayName}
                                    </span>
                                    {m.isFree ? (
                                      <span className="shrink-0 rounded bg-emerald-500/15 px-1 py-0.5 text-[10px] leading-none font-medium text-emerald-500">
                                        {t("IMAGE.FREE_BADGE")}
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground shrink-0 text-xs">
                                        {renderQuota(
                                          dollarsToQuota(m.pricePerCall),
                                          2,
                                        )}
                                      </span>
                                    )}
                                    {disabled && (
                                      <Icon
                                        name="lock"
                                        className="text-muted-foreground ml-1 h-3 w-3 shrink-0"
                                      />
                                    )}
                                  </CommandItem>
                                );
                              })}
                          </CommandGroup>
                          {effectiveModels.some(
                            (m) => m.family === "sync-image",
                          ) && (
                            <CommandGroup
                              heading={t("IMAGE.MODEL_GROUP_HOSTED")}
                            >
                              {effectiveModels
                                .filter((m) => m.family === "sync-image")
                                .filter((m) => isModelInTab(m, activeTab))
                                .map((m) => {
                                  const disabled = !isLoggedIn && !m.isFree;
                                  return (
                                    <CommandItem
                                      key={m.id}
                                      value={`${m.displayName} ${m.vendor ?? ""} ${m.id}`}
                                      onSelect={() => {
                                        if (disabled) {
                                          setCookie(
                                            AUTH_REDIRECT_COOKIE,
                                            pathname,
                                            { maxAge: 300 },
                                          );
                                          router.push("/login");
                                          setModelPickerOpen(false);
                                          return;
                                        }
                                        field.onChange(m.id);
                                        handleModelChange(m.id);
                                        setModelPickerOpen(false);
                                      }}
                                      className={cn(disabled && "opacity-50")}
                                    >
                                      {m.vendor && (
                                        <VendorIcon
                                          vendor={m.vendor}
                                          size={14}
                                        />
                                      )}
                                      <span className="min-w-0 flex-1 truncate">
                                        {m.displayName}
                                      </span>
                                      {m.isFree ? (
                                        <span className="shrink-0 rounded bg-emerald-500/15 px-1 py-0.5 text-[10px] leading-none font-medium text-emerald-500">
                                          {t("IMAGE.FREE_BADGE")}
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground shrink-0 text-xs">
                                          {m.pricePerCall > 0
                                            ? renderQuota(
                                                dollarsToQuota(m.pricePerCall),
                                                2,
                                              )
                                            : t("IMAGE.PRICING_RATIO_BASED")}
                                        </span>
                                      )}
                                      {disabled && (
                                        <Icon
                                          name="lock"
                                          className="text-muted-foreground ml-1 h-3 w-3 shrink-0"
                                        />
                                      )}
                                    </CommandItem>
                                  );
                                })}
                            </CommandGroup>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {descriptor.supportsSize &&
          (() => {
            const p =
              (form.watch("params") as
                | { width?: number; height?: number }
                | undefined) ?? {};
            return (
              <AspectRatioField
                width={p.width ?? 1024}
                height={p.height ?? 1024}
                onChange={(next) => {
                  const cur =
                    (form.watch("params") as
                      | Record<string, unknown>
                      | undefined) ?? {};
                  form.setValue(
                    "params",
                    {
                      ...cur,
                      width: next.width,
                      height: next.height,
                    } as never,
                    { shouldDirty: true },
                  );
                }}
              />
            );
          })()}

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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="params.steps"
            render={({ field }) => {
              const v = numParam("steps", descriptor.defaultParams.steps) ?? 20;
              return (
                <FormItem>
                  <FormLabel>{t("IMAGE.STEPS_LABEL")}</FormLabel>
                  <FormControl>
                    <SliderWithInput
                      min={1}
                      max={50}
                      step={1}
                      value={v}
                      onChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              );
            }}
          />

          {descriptor.supportsCfg && (
            <FormField
              control={form.control}
              name="params.cfg"
              render={({ field }) => {
                const v =
                  numParam("cfg", descriptor.defaultParams.cfg ?? 7) ?? 7;
                return (
                  <FormItem>
                    <FormLabel>{t("IMAGE.CFG_LABEL")}</FormLabel>
                    <FormControl>
                      <SliderWithInput
                        min={0}
                        max={15}
                        step={0.5}
                        value={v}
                        onChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                );
              }}
            />
          )}

          {descriptor.supportsGuidance && (
            <FormField
              control={form.control}
              name="params.guidance"
              render={({ field }) => {
                const v =
                  numParam(
                    "guidance",
                    descriptor.defaultParams.guidance ?? 4,
                  ) ?? 4;
                return (
                  <FormItem>
                    <FormLabel>{t("IMAGE.GUIDANCE_LABEL")}</FormLabel>
                    <FormControl>
                      <SliderWithInput
                        min={1}
                        max={10}
                        step={0.1}
                        value={v}
                        onChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                );
              }}
            />
          )}
        </div>

        {descriptor.supportsSampler ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="params.sampler"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("IMAGE.SAMPLER_LABEL")}</FormLabel>
                  <FormControl>
                    <Select
                      value={
                        field.value ?? descriptor.defaultParams.sampler ?? ""
                      }
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(descriptor.samplers ?? []).map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="params.scheduler"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("IMAGE.SCHEDULER_LABEL")}</FormLabel>
                  <FormControl>
                    <Select
                      value={
                        field.value ?? descriptor.defaultParams.scheduler ?? ""
                      }
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(descriptor.schedulers ?? []).map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                </FormItem>
              )}
            />
            <SeedField />
          </div>
        ) : (
          <SeedField />
        )}

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
            value={(form.watch("loras") as LoraEntry[] | undefined) ?? []}
            onChange={(loras) =>
              form.setValue(
                "loras",
                loras.length > 0 ? (loras as never) : (undefined as never),
                { shouldDirty: true },
              )
            }
          />
        )}

        {descriptor.supportsReferences && (
          <ReferenceUploader
            maxFiles={descriptor.maxReferenceImages}
            value={
              (form.watch("references") as ReferenceEntry[] | undefined) ?? []
            }
            onChange={(refs) =>
              form.setValue(
                "references",
                refs.length > 0 ? (refs as never) : (undefined as never),
                { shouldDirty: true },
              )
            }
          />
        )}

        {(descriptor.supportsQuality ||
          descriptor.supportsOutputFormat ||
          descriptor.supportsBackground ||
          descriptor.supportsWatermark ||
          descriptor.supportsStrength ||
          descriptor.supportsSeed) && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {descriptor.supportsQuality && descriptor.qualityChoices && (
              <QualityField
                choices={descriptor.qualityChoices}
                label={t("IMAGE.QUALITY_LABEL")}
                placeholder={t("IMAGE.QUALITY_DEFAULT")}
              />
            )}

            {descriptor.supportsOutputFormat &&
              descriptor.outputFormatChoices && (
                <OutputFormatField
                  choices={descriptor.outputFormatChoices}
                  label={t("IMAGE.OUTPUT_FORMAT_LABEL")}
                  placeholder={t("IMAGE.OUTPUT_FORMAT_DEFAULT")}
                />
              )}

            {descriptor.supportsBackground && (
              <FormField
                control={form.control}
                name="params.background"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("IMAGE.BACKGROUND_LABEL")}</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value ?? ""}
                        onValueChange={(v) => field.onChange(v || undefined)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={t("IMAGE.BACKGROUND_DEFAULT")}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="opaque">
                            {t("IMAGE.BACKGROUND_OPAQUE")}
                          </SelectItem>
                          <SelectItem value="transparent">
                            {t("IMAGE.BACKGROUND_TRANSPARENT")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            {descriptor.supportsWatermark && (
              <FormField
                control={form.control}
                name="params.watermark"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-md border px-3 py-2">
                    <FormLabel className="m-0">
                      {t("IMAGE.WATERMARK_LABEL")}
                    </FormLabel>
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={(field.value as boolean | undefined) ?? false}
                        onChange={(e) => field.onChange(e.target.checked)}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            {descriptor.supportsStrength && (
              <FormField
                control={form.control}
                name="params.strength"
                render={({ field }) => {
                  const v = typeof field.value === "number" ? field.value : 0.5;
                  return (
                    <FormItem>
                      <FormLabel>{t("IMAGE.STRENGTH_LABEL")}</FormLabel>
                      <FormControl>
                        <SliderWithInput
                          min={0}
                          max={1}
                          step={0.05}
                          value={v}
                          onChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  );
                }}
              />
            )}

            {descriptor.supportsSeed && (
              <FormField
                control={form.control}
                name="params.seed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("IMAGE.SEED_LABEL")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder={t("IMAGE.SEED_RANDOMIZE")}
                        value={(field.value as number | undefined) ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === ""
                              ? undefined
                              : Number(e.target.value),
                          )
                        }
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}
          </div>
        )}

        {activeTab === "img2img" &&
          (() => {
            const params = form.watch("params") as
              | { initImageUrl?: string }
              | undefined;
            return (
              <InitImageField
                value={params?.initImageUrl}
                onChange={(initImageUrl) => {
                  const cur =
                    (form.watch("params") as
                      | Record<string, unknown>
                      | undefined) ?? {};
                  form.setValue("params", { ...cur, initImageUrl } as never, {
                    shouldDirty: true,
                  });
                }}
              />
            );
          })()}

        {activeTab === "img2img" &&
          activeSubPill === "inpaint" &&
          (() => {
            const params = form.watch("params") as
              | { initImageUrl?: string }
              | undefined;
            return params?.initImageUrl ? (
              <InpaintCanvas imageUrl={params.initImageUrl} />
            ) : null;
          })()}

        {descriptor.supportsEmbedding && (
          <EmbeddingPicker
            family={descriptor.family}
            value={
              (
                form.watch("params") as
                  | { embeddings?: EmbeddingEntry[] }
                  | undefined
              )?.embeddings ?? []
            }
            onChange={(embeddings) => {
              const cur =
                form.watch("params") ?? {};
              form.setValue(
                "params",
                {
                  ...cur,
                  embeddings: embeddings.length > 0 ? embeddings : undefined,
                } as never,
                { shouldDirty: true },
              );
            }}
          />
        )}

        {descriptor.supportsVae && (
          <VaePicker
            value={form.watch("params")?.vae}
            onChange={(vae) => {
              const cur =
                form.watch("params") ?? {};
              form.setValue("params", { ...cur, vae } as never, {
                shouldDirty: true,
              });
            }}
          />
        )}

        {descriptor.supportsControlNet && (
          <ControlNetModal
            value={
              (
                form.watch("params") as
                  | { controlNet?: ControlNetValue }
                  | undefined
              )?.controlNet
            }
            onChange={(controlNet) => {
              const cur =
                form.watch("params") ?? {};
              form.setValue("params", { ...cur, controlNet } as never, {
                shouldDirty: true,
              });
            }}
          />
        )}

        {descriptor.supportsAdetailer && (
          <AdetailerSection
            family={descriptor.family}
            value={
              (
                form.watch("params") as
                  | { adetailer?: AdetailerValue }
                  | undefined
              )?.adetailer
            }
            onChange={(adetailer) => {
              const cur =
                form.watch("params") ?? {};
              form.setValue("params", { ...cur, adetailer } as never, {
                shouldDirty: true,
              });
            }}
          />
        )}

        {descriptor.supportsLayerDiffusion && (
          <LayerDiffusionField
            value={
              (
                form.watch("params") as
                  | { layerDiffusion?: { weight: number } }
                  | undefined
              )?.layerDiffusion
            }
            onChange={(layerDiffusion) => {
              const cur =
                form.watch("params") ?? {};
              form.setValue("params", { ...cur, layerDiffusion } as never, {
                shouldDirty: true,
              });
            }}
          />
        )}

        {descriptor.supportsHiresFix && (
          <UpscalerField
            upscaler={
              form.watch("params")
                ?.upscaler
            }
            multiplier={
              (
                form.watch("params") as
                  | { upscalerMultiplier?: number; hiresUpscale?: number }
                  | undefined
              )?.upscalerMultiplier ??
              form.watch("params")
                ?.hiresUpscale
            }
            hiresSteps={
              form.watch("params")
                ?.hiresSteps
            }
            denoise={
              form.watch("params")
                ?.hiresDenoise
            }
            onChange={(patch) => {
              const cur =
                form.watch("params") ?? {};
              form.setValue(
                "params",
                {
                  ...cur,
                  ...(patch.upscaler !== undefined && {
                    upscaler: patch.upscaler,
                  }),
                  ...(patch.multiplier !== undefined && {
                    upscalerMultiplier: patch.multiplier,
                    hiresUpscale: patch.multiplier,
                  }),
                  ...(patch.hiresSteps !== undefined && {
                    hiresSteps: patch.hiresSteps,
                  }),
                  ...(patch.denoise !== undefined && {
                    hiresDenoise: patch.denoise,
                  }),
                } as never,
                { shouldDirty: true },
              );
            }}
          />
        )}

        {descriptor.supportsClipSkip && (
          <AdvancedSettingsAccordion
            clipSkip={
              form.watch("params")
                ?.clipSkip
            }
            ensd={form.watch("params")?.ensd}
            onChange={(patch) => {
              const cur =
                form.watch("params") ?? {};
              form.setValue("params", { ...cur, ...patch } as never, {
                shouldDirty: true,
              });
            }}
          />
        )}

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
              href="/generate"
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
