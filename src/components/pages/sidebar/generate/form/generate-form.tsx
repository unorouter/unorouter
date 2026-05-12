"use client";

import { VendorIcon } from "@/components/elements/brand/vendor-icon";
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
import {
  useSnapshotQuery,
  useSubmitGenerationMutation,
  useUploadMaskMutation,
} from "@/hooks/generation-hook";
import { useAuthQuery } from "@/hooks/auth-hook";
import { usePricingQuery } from "@/hooks/pricing-hook";
import {
  AUTH_REDIRECT_COOKIE,
  dollarsToQuota,
  renderQuota,
} from "@/lib/config/constants";
import { cn } from "@/lib/utils";
import { setCookie } from "cookies-next";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import {
  getModelDescriptor,
  type GenerationModelDescriptor,
} from "@/lib/config/generation-models";
import { getEffectiveGenerationModels } from "@/lib/config/generation-models-dynamic";
import {
  generationSubmitBody,
  type GenerationModel,
} from "@/lib/validation/generation";
import type { RestoredFromPng } from "@/lib/utils/png-metadata";
import { typeboxResolver } from "@hookform/resolvers/typebox";
import {
  activeSessionIdAtom,
  activeSnapshotIdAtom,
  activeSubPillAtom,
  activeTabAtom,
  editDraftAtom,
  img2imgDraftAtom,
  inpaintMaskAtom,
  restoreSnapshotIntoFormAtom,
  samplerMemoryAtom,
  text2imgDraftAtom,
  type GenerateDraft,
  type GenerateTab,
} from "@/store/generation-store";
import { useAtom, useAtomValue } from "jotai";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { LuChevronsUpDown, LuLock, LuSparkles } from "react-icons/lu";
import {
  AdetailerSection,
  type AdetailerValue,
} from "../fields/adetailer-section";
import { AdvancedSettingsAccordion } from "../fields/advanced-settings-accordion";
import {
  ControlNetModal,
  type ControlNetValue,
} from "../fields/controlnet-modal";
import {
  EmbeddingPicker,
  type EmbeddingEntry,
} from "../fields/embedding-picker";
import { InitImageField } from "../fields/init-image-field";
import { InpaintCanvas } from "../fields/inpaint-canvas";
import { LayerDiffusionField } from "../fields/layer-diffusion-field";
import { LoraPicker, type LoraEntry } from "../fields/lora-picker";
import { PngImport } from "./png-import";
import {
  ReferenceUploader,
  type ReferenceEntry,
} from "../fields/reference-uploader";
import { UpscalerField } from "../fields/upscaler-field";
import { VaePicker } from "../fields/vae-picker";
import {
  OutputFormatField,
  QualityField,
  SeedField,
  SizeField,
  SliderWithInput,
  TokenEstimate,
} from "./generate-form-fields";

const VARIANT_CHOICES = [1, 2, 4] as const;

// Filter that decides whether a model descriptor is allowed on the
// currently active tab. A descriptor without `tabs` is treated as
// Text2Img-only (the v1 default). Edit tab only accepts descriptors
// that explicitly opt in (Flux Kontext, gpt-image-1, Gemini 3 Pro Image,
// flux2-dev-compose).
function isModelInTab(m: GenerationModelDescriptor, tab: GenerateTab): boolean {
  if (!m.tabs) return tab === "text2img";
  return m.tabs.includes(tab);
}

const INITIAL_MODEL: GenerationModel = "pony";

// Build the initial form values from the chosen model's descriptor.
// Cast at the boundary because the form schema's `params` is a partial
// shape (every numeric is optional) while the descriptor provides every
// default. The runtime contract is enforced by typeboxResolver.
function defaultsFor(d: GenerationModelDescriptor) {
  const modelId = d.id;
  return {
    model: modelId,
    prompt: "",
    negativePrompt: "",
    params: { ...d.defaultParams },
    visibility: "private" as const,
    // Per model: Pony / Endgame / Flux 2 compose default to NSFW true;
    // vanilla SDXL + Flux 2 dev default to false. Owner-only is the
    // policy when nsfw=true (see setVisibility on the server).
    nsfw: d.nsfwDefault,
    extraParams: { variants: 1 } as Record<string, unknown>,
  };
}

export function GenerateForm() {
  const t = useTranslations();
  const locale = useLocale();
  const submitMut = useSubmitGenerationMutation();
  // Studio tab / sub-pill awareness — submit threads these as `mode`.
  const activeTab = useAtomValue(activeTabAtom);
  const activeSubPill = useAtomValue(activeSubPillAtom);
  const [inpaintMask, setInpaintMask] = useAtom(inpaintMaskAtom);
  const uploadMaskMut = useUploadMaskMutation();
  const searchParams = useSearchParams();
  const [activeSessionId, setActiveSessionId] = useAtom(activeSessionIdAtom);
  const [activeSnapshotId, setActiveSnapshotId] = useAtom(activeSnapshotIdAtom);
  const [restorePayload, setRestorePayload] = useAtom(
    restoreSnapshotIntoFormAtom,
  );
  // Form persistence atoms. Each top-level tab has its own draft slot,
  // so switching tabs preserves each one's last state independently.
  // samplerMemoryAtom holds per-model param snapshots so flipping back to
  // a previously-used model restores its sampler/cfg/steps values.
  //
  // Picks the right atom for the currently active tab. The hover-toolbar
  // shortcut routes between tabs via activeTabAtom; the form mount/effect
  // chain below re-runs when this swap fires so the draft for the new tab
  // is loaded.
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
  // ?hires=1 is set by the result tile's "Hires" shortcut. When the seed
  // source's model supports the hires-fix block, the seed effect bumps
  // hiresDenoise / hiresUpscale to the canonical defaults so the user
  // gets a higher-detail second pass without manually toggling.
  const hiresShortcut = searchParams.get("hires") === "1";
  // Seed source: explicit ?remix=<snapshotId> wins. Otherwise the form
  // doesn't auto-seed from the active snapshot — restoring older snapshots
  // happens via the chevron-driven `restoreSnapshotIntoFormAtom` channel.
  const seedSourceId = remixId;
  const seedQuery = useSnapshotQuery(seedSourceId);

  // Pricing-derived dynamic image models (hosted vendors with
  // metadata.maxImageInputs >= 6) merged with the static ComfyUI templates.
  // The pricing payload is prefetched in (generate)/layout.tsx so the data
  // is available on first paint.
  const pricingQuery = usePricingQuery();
  const effectiveModels = getEffectiveGenerationModels(
    pricingQuery.data?.models,
  );
  const findDescriptor = (id: GenerationModel): GenerationModelDescriptor =>
    effectiveModels.find((m) => m.id === id) ?? getModelDescriptor(id);
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  // Anonymous browsing: free models are clickable, paid ones look disabled
  // and trigger a redirect to /login on click. Mirrors the chat selector.
  const authQuery = useAuthQuery();
  const isLoggedIn = !!authQuery.data;
  const router = useRouter();
  const pathname = usePathname();

  const form = useForm({
    resolver: typeboxResolver(generationSubmitBody),
    // typeboxResolver wants the inferred shape; the descriptor-derived
    // defaults are a structurally-compatible superset.
    defaultValues: defaultsFor(getModelDescriptor(INITIAL_MODEL)) as never,
  });

  // form.watch returns string | undefined; coerce to GenerationModel.
  // eslint-disable-next-line react-hooks/incompatible-library -- form.watch is the documented react-hook-form API; the React Compiler warning is acceptable per existing codebase precedent.
  const selectedModel =
    (form.watch("model") as GenerationModel | undefined) ?? INITIAL_MODEL;
  const descriptor = findDescriptor(selectedModel);

  // eslint-disable-next-line react-hooks/incompatible-library
  const variantsRaw = (
    form.watch("extraParams") as { variants?: number } | undefined
  )?.variants;
  const variants =
    typeof variantsRaw === "number" && [1, 2, 4].includes(variantsRaw)
      ? (variantsRaw as 1 | 2 | 4)
      : 1;
  const totalQuota = dollarsToQuota(descriptor.pricePerCall * variants);

  const handleModelChange = (next: string) => {
    const nextModel = next as GenerationModel;
    const nextDesc = findDescriptor(nextModel);
    form.setValue("model", nextModel);
    // Restore per-model param memory when we've seen this model before;
    // otherwise apply the descriptor's defaults. This makes "I always run
    // Pony at CFG 10 but Endgame at CFG 4" actually stick across model
    // switches instead of resetting every time.
    const remembered = samplerMemory[nextModel];
    const params = remembered
      ? { ...nextDesc.defaultParams, ...remembered }
      : { ...nextDesc.defaultParams };
    form.setValue("params", params as never, { shouldDirty: true });
    if (!nextDesc.supportsNegativePrompt) form.setValue("negativePrompt", "");
    if (!nextDesc.supportsReferences) form.setValue("references", undefined);
    if (!nextDesc.supportsLoraChain) form.setValue("loras", undefined);
    // Reset nsfw to the new model's default. The user's previous toggle
    // doesn't carry over because the policy is model-driven (Pony is
    // always NSFW-capable; switching to Flux 2 dev should clear the
    // flag so the publish toggle reappears).
    form.setValue("nsfw", nextDesc.nsfwDefault, { shouldDirty: true });
  };

  // Seeding. The form pre-fills with another gen's settings when:
  //   - `?remix=<id>` is in the URL (explicit Remix click), or
  //   - the user opens an existing gen via the sidebar / URL id.
  // Guarded by a ref so we only seed once per source id (the form's dirty
  // state then takes over and the user can edit freely).
  const seededIdRef = useRef<string | null>(null);
  useEffect(() => {
    const data = seedQuery.data;
    if (!data) return;
    if (seededIdRef.current === data.id) return;
    seededIdRef.current = data.id;

    const model = data.model as GenerationModel;
    const desc = findDescriptor(model);
    // Hires shortcut: when the source model supports the hires-fix
    // pass and the URL flag is set, pre-toggle denoise + upscale to
    // the canonical defaults the toggle uses (matches HiresFixField's
    // 0.5 / 1.5). Models without supportsHiresFix ignore the flag.
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
      extraParams: { variants: 1 },
    } as never);
    // findDescriptor closes over effectiveModels which derives from
    // pricingQuery.data; the seededIdRef guard prevents re-runs so we
    // intentionally exclude it from the dep array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedQuery.data, form]);

  // Anonymous-friendly default: when the form's current model is paid and
  // the visitor isn't logged in, swap to the cheapest free image model so
  // the studio is immediately usable without an account. Mirrors the chat
  // selector's auto-pick behavior.
  useEffect(() => {
    if (effectiveModels.length === 0) return;
    // eslint-disable-next-line react-hooks/incompatible-library
    const current = (form.watch("model") as string | undefined) ?? "";
    const desc = effectiveModels.find((m) => m.id === current);
    if (desc && (isLoggedIn || desc.isFree)) return;
    const freePool = effectiveModels.filter((m) => m.isFree);
    if (freePool.length === 0) return;
    handleModelChange(freePool[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, effectiveModels.length]);

  // Tab-gated default: the currently selected model may not exist on the
  // newly active tab (e.g. Pony is Text2Img/Img2Img only — switching to
  // Edit must auto-swap to a Kontext / gpt-image-1 / Gemini variant).
  // First model in the tab's allowlist wins.
  useEffect(() => {
    if (effectiveModels.length === 0) return;
    // eslint-disable-next-line react-hooks/incompatible-library
    const current = (form.watch("model") as string | undefined) ?? "";
    const desc = effectiveModels.find((m) => m.id === current);
    if (desc && isModelInTab(desc, activeTab)) return;
    const pool = effectiveModels.filter((m) => isModelInTab(m, activeTab));
    if (pool.length === 0) return;
    handleModelChange(pool[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, effectiveModels.length]);

  // Draft restore on mount. Only fires when there's no remix or active-id
  // seed source — those win over the persisted draft so a remix click
  // shows the source's settings, not last-typed prompt. The ref guard
  // means we only attempt restore once per mount.
  // The restore-guard is keyed by active tab. Switching tabs (e.g. via
  // the hover toolbar) resets it so the new tab's draft gets re-applied
  // on the next render. Without this, the form keeps the previous tab's
  // values even though the user explicitly switched modes.
  const draftRestoredRef = useRef<string | null>(null);
  useEffect(() => {
    if (draftRestoredRef.current === activeTab) return;
    if (seedSourceId) return; // remix / active id takes precedence
    draftRestoredRef.current = activeTab;
    if (!draft) {
      // First visit to this tab — clear the form back to a descriptor
      // appropriate for the active tab. Text2Img uses INITIAL_MODEL
      // (pony); Edit needs an edit-family default since pony's tabs
      // list doesn't include "edit". Pick the first descriptor whose
      // `tabs` allows the current tab.
      const fallback =
        effectiveModels.find((m) => isModelInTab(m, activeTab)) ??
        getModelDescriptor(INITIAL_MODEL);
      form.reset(defaultsFor(fallback) as never);
      return;
    }
    form.reset({
      ...defaultsFor(
        getModelDescriptor((draft.model as GenerationModel) || INITIAL_MODEL),
      ),
      model: draft.model as GenerationModel,
      prompt: draft.prompt,
      negativePrompt: draft.negativePrompt ?? "",
      params: draft.params as never,
      loras: draft.loras as never,
      references: draft.references as never,
      nsfw: draft.nsfw,
      extraParams: draft.extraParams as never,
    } as never);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, seedSourceId, draft, form]);

  // Persist current form values to the draft atom whenever they change.
  // Debounced via a 500ms trailing write so each keystroke doesn't hit
  // localStorage. Cleared on successful submit (see onSubmit below).
  //
  // The setter is held in a ref so swapping tabs re-aims the write at
  // the new tab's atom without unsubscribing/resubscribing the form-
  // watcher (which would lose its in-flight debounce).
  const setDraftRef = useRef(setDraft);
  useEffect(() => {
    setDraftRef.current = setDraft;
  }, [setDraft]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/incompatible-library
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
          extraParams: (values.extraParams as Record<string, unknown>) ?? {
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

  // PNG metadata import. Best-effort overlay onto the current form
  // state: only fields the parser recovered get touched, the rest
  // (model, visibility, batch, loras, references) stay as-is. Reads
  // params from the watched form so the user's other in-progress
  // edits don't get clobbered.
  const onPngImport = (data: RestoredFromPng) => {
    if (data.prompt !== undefined) {
      form.setValue("prompt", data.prompt, { shouldDirty: true });
    }
    if (data.negativePrompt !== undefined) {
      form.setValue("negativePrompt", data.negativePrompt, {
        shouldDirty: true,
      });
    }
    // eslint-disable-next-line react-hooks/incompatible-library
    const cur =
      (form.watch("params") as Record<string, unknown> | undefined) ?? {};
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
    // Strip the UI-only `variants` field out before forwarding; convert
    // it to `params.n` which the server uses to pick batch_size /
    // upstream `n` / loop count.
    const extras = { ...((data.extraParams ?? {}) as Record<string, unknown>) };
    delete extras.variants;
    const cleanedExtras = Object.keys(extras).length > 0 ? extras : undefined;
    const existingParams =
      (data.params as Record<string, unknown> | undefined) ?? {};
    const paramsWithN: Record<string, unknown> = {
      ...existingParams,
      n: variants,
    };

    // Resolve generation mode from tab + sub-pill. Text2Img top tab =>
    // always txt2img. Img2Img top tab => the active sub-pill. Edit tab
    // => the "edit" mode. Legacy snapshots that don't carry a mode are
    // treated as txt2img by the server.
    const mode:
      | "txt2img"
      | "img2img"
      | "upscale"
      | "adetailer"
      | "inpaint"
      | "edit" =
      activeTab === "text2img"
        ? "txt2img"
        : activeTab === "edit"
          ? "edit"
          : activeSubPill;

    // Inpaint: if the brush canvas has a mask, upload it now and
    // thread the URL into params.maskUrl. The mask atom is cleared
    // after a successful submit so the next generation starts clean.
    if (mode === "inpaint" && inpaintMask) {
      const blob = await (await fetch(inpaintMask)).blob();
      const file = new File([blob], "mask.png", { type: "image/png" });
      const uploaded = await uploadMaskMut.mutateAsync(file);
      paramsWithN.maskUrl = uploaded.url;
    }

    const submitted = await submitMut.mutateAsync({
      body: {
        ...data,
        mode,
        // Append to the active session if there is one; otherwise the
        // server creates a fresh session and the response carries its id.
        sessionId: activeSessionId ?? undefined,
        params: paramsWithN as never,
        extraParams: cleanedExtras,
      },
    });
    if (mode === "inpaint") setInpaintMask(null);

    // Persist the params under this model's key so a future model switch
    // back to it restores the same sampler/cfg/steps values.
    const modelKey = (data.model as string) ?? INITIAL_MODEL;
    setSamplerMemory({
      ...samplerMemory,
      [modelKey]: existingParams,
    });
    setDraft(null);

    // Sync both atoms so the result column re-renders without remounting
    // the form. URL becomes /generate/<sessionId>?snap=<snapshotId>.
    setActiveSessionId(submitted.session.id);
    setActiveSnapshotId(submitted.snapshot.id);
    window.history.replaceState(
      null,
      "",
      `/${locale}/generate/${submitted.session.id}?snap=${submitted.snapshot.id}`,
    );
  });

  // Subscribe to the chevron-driven restore payload. When the result column
  // navigates to an older snapshot, this atom is set with that snapshot's
  // frozen params; we overwrite the form fields once, then clear the atom.
  useEffect(() => {
    if (!restorePayload) return;
    const modelId = (restorePayload.model as GenerationModel) ?? INITIAL_MODEL;
    const desc = findDescriptor(modelId);
    // Hover toolbar (Inpaint/Upscale/ADetailer/Edit) sends an
    // initImageUrl + target tab/sub-pill. Merge initImageUrl into
    // params so the worker has the source image; the tab/sub-pill is
    // applied by the result panel before the restore fires.
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
      extraParams: (restorePayload.extraParams ?? {
        variants: 1,
      }) as Record<string, unknown>,
    } as never);
    setRestorePayload(null);
    // findDescriptor closes over effectiveModels and is intentionally not
    // a dep. Restore runs only when the payload identity flips.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restorePayload]);

  void activeSnapshotId;

  // Helper to read a numeric value out of params with a fallback to the
  // descriptor's default. Avoids the union-of-undefined mess in render.
  const numParam = (
    key: "steps" | "cfg" | "guidance" | "seed",
    fallback?: number,
  ): number | undefined => {
    // eslint-disable-next-line react-hooks/incompatible-library
    const params = form.watch("params") as
      | Record<string, number | undefined>
      | undefined;
    return params?.[key] ?? fallback;
  };

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="flex flex-col gap-6">
        {/* Drop a ComfyUI PNG to restore prompt + params from its
            embedded tEXt chunks. Best-effort - anything we can't
            recover stays at the form's current value. */}
        <PngImport onImport={onPngImport} />

        {/* Model + Size — small dropdowns, share a row when both apply.
            Falls back to model-only on Flux 2 (locked to 1024x1024). */}
        <div
          className={
            descriptor.supportsSize
              ? "grid grid-cols-1 gap-4 sm:grid-cols-[2fr_1fr]"
              : ""
          }
        >
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
                      <LuChevronsUpDown className="text-muted-foreground ml-2 h-4 w-4 shrink-0" />
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
                                          {
                                            maxAge: 300,
                                          },
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
                                      <LuLock className="text-muted-foreground ml-1 h-3 w-3 shrink-0" />
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
                                            {
                                              maxAge: 300,
                                            },
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
                                        <LuLock className="text-muted-foreground ml-1 h-3 w-3 shrink-0" />
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

          {/* Size lives in the same row as Model when supported (SDXL only). */}
          {descriptor.supportsSize && (
            <SizeField
              value={(() => {
                // eslint-disable-next-line react-hooks/incompatible-library
                const p = form.watch("params") as
                  | { width?: number; height?: number }
                  | undefined;
                return `${p?.width ?? 1024}x${p?.height ?? 1024}`;
              })()}
              onChange={(v) => {
                const [nw, nh] = v.split("x").map(Number);
                // eslint-disable-next-line react-hooks/incompatible-library
                const cur =
                  (form.watch("params") as
                    | Record<string, unknown>
                    | undefined) ?? {};
                form.setValue(
                  "params",
                  { ...cur, width: nw, height: nh } as never,
                  { shouldDirty: true },
                );
              }}
            />
          )}
        </div>

        {/* Prompt */}
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
                  value={(field.value as string | undefined) ?? ""}
                  onChange={field.onChange}
                />
              </FormControl>
              <TokenEstimate
                text={(field.value as string | undefined) ?? ""}
                family={descriptor.family}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Negative prompt - SDXL family only */}
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
                    value={(field.value as string | undefined) ?? ""}
                    onChange={field.onChange}
                  />
                </FormControl>
                <TokenEstimate
                  text={(field.value as string | undefined) ?? ""}
                  family={descriptor.family}
                />
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Steps + CFG/Guidance sliders */}
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

        {/* Sampler + Scheduler + Seed share one row when sampler is supported.
            On Flux 2 (no sampler) we drop to Seed-only on a single row. */}
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
                        (field.value as string | undefined) ??
                        descriptor.defaultParams.sampler ??
                        ""
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
                        (field.value as string | undefined) ??
                        descriptor.defaultParams.scheduler ??
                        ""
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
            <SeedField form={form} />
          </div>
        ) : (
          <SeedField form={form} />
        )}

        {/* Variants standalone row. The legacy Hires-fix toggle that
            used to share this row was removed in the redesign — the
            new UpscalerField below (rendered when descriptor.supportsHiresFix)
            replaces it with multiplier radios + Upscaler dropdown
            +  Hires Steps + Denoise. Keeping both would let users
            create invalid state (multiplier=3 while the legacy
            upscale slider caps at 2). */}
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
                onClick={() => {
                  // eslint-disable-next-line react-hooks/incompatible-library
                  const cur =
                    (form.watch("extraParams") as
                      | Record<string, unknown>
                      | undefined) ?? {};
                  form.setValue("extraParams", { ...cur, variants: n });
                }}
              >
                {n}
              </Button>
            ))}
          </div>
        </FormItem>

        {/* LoRAs - SDXL family only */}
        {descriptor.supportsLoraChain && (
          <LoraPicker
            family={descriptor.family}
            value={
              // eslint-disable-next-line react-hooks/incompatible-library
              (form.watch("loras") as LoraEntry[] | undefined) ?? []
            }
            onChange={(loras) =>
              form.setValue("loras", loras.length > 0 ? loras : undefined, {
                shouldDirty: true,
              })
            }
          />
        )}

        {/* References - flux2-dev-compose + sync-image models */}
        {descriptor.supportsReferences && (
          <ReferenceUploader
            maxFiles={descriptor.maxReferenceImages}
            value={
              // eslint-disable-next-line react-hooks/incompatible-library
              (form.watch("references") as ReferenceEntry[] | undefined) ?? []
            }
            onChange={(refs) =>
              form.setValue("references", refs.length > 0 ? refs : undefined, {
                shouldDirty: true,
              })
            }
          />
        )}

        {/* Vendor-specific sync-image knobs. Only render the controls the
            current model's relay adapter actually consumes. The dispatch
            layer in generation-dispatch.ts threads these into the upstream
            body shape per endpoint kind. */}
        {(descriptor.supportsQuality ||
          descriptor.supportsOutputFormat ||
          descriptor.supportsBackground ||
          descriptor.supportsWatermark ||
          descriptor.supportsStrength ||
          descriptor.supportsSeed) && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {descriptor.supportsQuality && descriptor.qualityChoices && (
              <QualityField
                form={form}
                choices={descriptor.qualityChoices}
                label={t("IMAGE.QUALITY_LABEL")}
                placeholder={t("IMAGE.QUALITY_DEFAULT")}
              />
            )}

            {descriptor.supportsOutputFormat &&
              descriptor.outputFormatChoices && (
                <OutputFormatField
                  form={form}
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
                        value={(field.value as string | undefined) ?? ""}
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

        {/* Init image upload — shown on all Img2Img sub-pills. The brush
            canvas (Inpaint sub-pill) mounts on top of this once an image
            is picked. */}
        {activeTab === "img2img" &&
          (() => {
            // eslint-disable-next-line react-hooks/incompatible-library
            const params = form.watch("params") as
              | { initImageUrl?: string }
              | undefined;
            return (
              <InitImageField
                value={params?.initImageUrl}
                onChange={(initImageUrl) => {
                  // eslint-disable-next-line react-hooks/incompatible-library
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

        {/* Inpaint brush canvas. Mounts when sub-pill is inpaint AND a
            source image is set. Hidden otherwise. */}
        {activeTab === "img2img" &&
          activeSubPill === "inpaint" &&
          (() => {
            // eslint-disable-next-line react-hooks/incompatible-library
            const params = form.watch("params") as
              | { initImageUrl?: string }
              | undefined;
            return params?.initImageUrl ? (
              <InpaintCanvas imageUrl={params.initImageUrl} />
            ) : null;
          })()}

        {/* ---- Studio knobs (gated by descriptor flags) ---- */}
        {descriptor.supportsEmbedding && (
          <EmbeddingPicker
            family={descriptor.family}
            value={
              // eslint-disable-next-line react-hooks/incompatible-library
              (
                form.watch("params") as
                  | { embeddings?: EmbeddingEntry[] }
                  | undefined
              )?.embeddings ?? []
            }
            onChange={(embeddings) => {
              // eslint-disable-next-line react-hooks/incompatible-library
              const cur =
                (form.watch("params") as Record<string, unknown> | undefined) ??
                {};
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
            value={
              // eslint-disable-next-line react-hooks/incompatible-library
              (form.watch("params") as { vae?: string } | undefined)?.vae
            }
            onChange={(vae) => {
              // eslint-disable-next-line react-hooks/incompatible-library
              const cur =
                (form.watch("params") as Record<string, unknown> | undefined) ??
                {};
              form.setValue("params", { ...cur, vae } as never, {
                shouldDirty: true,
              });
            }}
          />
        )}

        {descriptor.supportsControlNet && (
          <ControlNetModal
            value={
              // eslint-disable-next-line react-hooks/incompatible-library
              (
                form.watch("params") as
                  | { controlNet?: ControlNetValue }
                  | undefined
              )?.controlNet
            }
            onChange={(controlNet) => {
              // eslint-disable-next-line react-hooks/incompatible-library
              const cur =
                (form.watch("params") as Record<string, unknown> | undefined) ??
                {};
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
              // eslint-disable-next-line react-hooks/incompatible-library
              (
                form.watch("params") as
                  | { adetailer?: AdetailerValue }
                  | undefined
              )?.adetailer
            }
            onChange={(adetailer) => {
              // eslint-disable-next-line react-hooks/incompatible-library
              const cur =
                (form.watch("params") as Record<string, unknown> | undefined) ??
                {};
              form.setValue("params", { ...cur, adetailer } as never, {
                shouldDirty: true,
              });
            }}
          />
        )}

        {descriptor.supportsLayerDiffusion && (
          <LayerDiffusionField
            value={
              // eslint-disable-next-line react-hooks/incompatible-library
              (
                form.watch("params") as
                  | { layerDiffusion?: { weight: number } }
                  | undefined
              )?.layerDiffusion
            }
            onChange={(layerDiffusion) => {
              // eslint-disable-next-line react-hooks/incompatible-library
              const cur =
                (form.watch("params") as Record<string, unknown> | undefined) ??
                {};
              form.setValue("params", { ...cur, layerDiffusion } as never, {
                shouldDirty: true,
              });
            }}
          />
        )}

        {descriptor.supportsHiresFix && (
          <UpscalerField
            upscaler={
              // eslint-disable-next-line react-hooks/incompatible-library
              (form.watch("params") as { upscaler?: string } | undefined)
                ?.upscaler
            }
            multiplier={
              // eslint-disable-next-line react-hooks/incompatible-library
              (
                form.watch("params") as
                  | { upscalerMultiplier?: number; hiresUpscale?: number }
                  | undefined
              )?.upscalerMultiplier ??
              // eslint-disable-next-line react-hooks/incompatible-library
              (form.watch("params") as { hiresUpscale?: number } | undefined)
                ?.hiresUpscale
            }
            hiresSteps={
              // eslint-disable-next-line react-hooks/incompatible-library
              (form.watch("params") as { hiresSteps?: number } | undefined)
                ?.hiresSteps
            }
            denoise={
              // eslint-disable-next-line react-hooks/incompatible-library
              (form.watch("params") as { hiresDenoise?: number } | undefined)
                ?.hiresDenoise
            }
            onChange={(patch) => {
              // eslint-disable-next-line react-hooks/incompatible-library
              const cur =
                (form.watch("params") as Record<string, unknown> | undefined) ??
                {};
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
              // eslint-disable-next-line react-hooks/incompatible-library
              (form.watch("params") as { clipSkip?: number } | undefined)
                ?.clipSkip
            }
            ensd={
              // eslint-disable-next-line react-hooks/incompatible-library
              (form.watch("params") as { ensd?: number } | undefined)?.ensd
            }
            onChange={(patch) => {
              // eslint-disable-next-line react-hooks/incompatible-library
              const cur =
                (form.watch("params") as Record<string, unknown> | undefined) ??
                {};
              form.setValue("params", { ...cur, ...patch } as never, {
                shouldDirty: true,
              });
            }}
          />
        )}

        {/* Submit + New-session row. The "New session" pill only renders
            when there's already an active session so it doesn't add UI
            noise on the first submit. */}
        <div className="flex flex-col gap-2">
          {/* eslint-disable-next-line react-hooks/incompatible-library */}
          <Button
            type="submit"
            disabled={
              submitMut.isPending ||
              !((form.watch("prompt") as string | undefined) ?? "")
            }
            size="lg"
          >
            <LuSparkles className="mr-2" />
            {submitMut.isPending
              ? t("IMAGE.SUBMITTING")
              : `${t("IMAGE.SUBMIT")} - ${renderQuota(totalQuota, 2)}`}
          </Button>
          {activeSessionId && (
            // Proper navigation so the URL drops both pathname and search
            // params (including ?snap=) and the page re-resolves the route
            // segment. Clearing atoms in an onClick handler was racy with
            // the page-level effect that re-writes ?snap= once a session
            // loads.
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
