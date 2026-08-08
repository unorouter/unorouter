"use client";

import { useAuthQuery } from "@/hooks/auth/auth-hook";
import { useSnapshotQuery } from "@/hooks/ai/image-hook";
import { usePricingQuery } from "@/hooks/models/pricing-hook";
import {
  getModelDescriptor,
  type PlaygroundModelDescriptor,
} from "@/lib/ai/playground/models";
import { getEffectiveGenerationModels } from "@/lib/ai/playground/models-dynamic";
import {
  generationFormValues,
  type GenerationFormValues,
  type PlaygroundModel,
} from "@/lib/validation/playground";
import {
  editDraftAtom,
  img2imgDraftAtom,
  restoreSnapshotIntoFormAtom,
  samplerMemoryAtom,
  text2imgDraftAtom,
  type GenerateDraft,
} from "@/store/image-store";
import { typeboxResolver } from "@hookform/resolvers/typebox";
import { useAtom } from "jotai";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter, useSearchParams } from "next/navigation";
import { useImageNav, type GenerateTab } from "../image-nav";
import { INITIAL_MODEL } from "../image-constants";
import { isModelInTab } from "./mode";

function defaultsFor(d: PlaygroundModelDescriptor): GenerationFormValues {
  return {
    model: d.id,
    prompt: "",
    negativePrompt: "",
    params: { ...d.defaultParams },
    visibility: "private",
    ui: { variants: 1 },
  };
}

function draftAtomFor(tab: GenerateTab) {
  if (tab === "img2img") return img2imgDraftAtom;
  if (tab === "edit") return editDraftAtom;
  return text2imgDraftAtom;
}

export function useGenerationForm() {
  const nav = useImageNav();
  const activeTab = nav.tab;
  const searchParams = useSearchParams();
  const router = useRouter();
  const authQuery = useAuthQuery();
  const isLoggedIn = !!authQuery.data;

  const [samplerMemory, setSamplerMemory] = useAtom(samplerMemoryAtom);
  const [draft, setDraft] = useAtom(draftAtomFor(activeTab));
  const [restorePayload, setRestorePayload] = useAtom(
    restoreSnapshotIntoFormAtom,
  );

  const remixId = searchParams.get("remix");
  const hiresShortcut = searchParams.get("hires") === "1";
  const inpaintShortcut = searchParams.get("inpaint") === "1";
  const seedQuery = useSnapshotQuery(remixId);

  const pricingQuery = usePricingQuery();
  const effectiveModels = getEffectiveGenerationModels(
    pricingQuery.data?.models,
  );
  const findDescriptor = (id: PlaygroundModel): PlaygroundModelDescriptor =>
    effectiveModels.find((m) => m.id === id) ?? getModelDescriptor(id);

  const form = useForm<GenerationFormValues>({
    resolver: typeboxResolver(generationFormValues),
    defaultValues: defaultsFor(getModelDescriptor(INITIAL_MODEL)),
  });

  const selectedModel = form.watch("model") ?? INITIAL_MODEL;
  const descriptor = findDescriptor(selectedModel);

  const changeModel = (next: string) => {
    const nextDesc = findDescriptor(next);
    form.setValue("model", next);
    const remembered = samplerMemory[next];
    const params = remembered
      ? { ...nextDesc.defaultParams, ...remembered }
      : { ...nextDesc.defaultParams };
    form.setValue("params", params, {
      shouldDirty: true,
    });
    if (!nextDesc.supportsNegativePrompt) form.setValue("negativePrompt", "");
    if (!nextDesc.supportsReferences) form.setValue("references", undefined);
    if (!nextDesc.supportsLoraChain) form.setValue("loras", undefined);
  };

  const seededIdRef = useRef<string | null>(null);
  useEffect(() => {
    const data = seedQuery.data;
    if (!data || seededIdRef.current === data.id) return;
    seededIdRef.current = data.id;
    const desc = findDescriptor(data.model);
    // Hires/inpaint shortcuts re-render the snapshot's own image, so it comes along as
    // the init image.
    const hiresSource = data.images?.[0]?.src;
    const inpaintParams =
      inpaintShortcut && hiresSource
        ? { initImageUrl: hiresSource, strength: 0.85 }
        : {};
    const hiresParams =
      hiresShortcut && desc.supportsHiresFix && hiresSource
        ? {
            hiresDenoise: 0.5,
            hiresUpscale: 1.5,
            initImageUrl: hiresSource,
          }
        : {};
    form.reset({
      ...defaultsFor(desc),
      prompt: data.prompt,
      negativePrompt: data.negativePrompt ?? "",
      params: {
        ...desc.defaultParams,
        ...(data.params ?? {}),
        ...hiresParams,
        ...inpaintParams,
      },
      loras: data.loras ?? undefined,
      references: data.references ?? undefined,
      visibility: "private",
      ui: { variants: 1 },
    });
    // Consume the one-shot params in the same URL write that lands the user on the tab
    // showing the init image; the post-submit remount resets the ref guard, so leaving
    // them would re-run this reset over the user's edits.
    const url = new URL(window.location.href);
    for (const key of ["remix", "hires", "inpaint"])
      url.searchParams.delete(key);
    if (Object.keys(inpaintParams).length > 0) {
      url.searchParams.set("tab", "img2img");
      url.searchParams.set("mode", "inpaint");
    } else if (Object.keys(hiresParams).length > 0) {
      url.searchParams.set("tab", "img2img");
    }
    router.replace(url.pathname + url.search, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedQuery.data, form]);

  // Guests only run free models. A logged-in user is never swapped: an unlisted model is
  // a passthrough checkpoint or a not-yet-loaded catalog entry.
  useEffect(() => {
    if (effectiveModels.length === 0 || isLoggedIn) return;
    const current = form.watch("model") ?? "";
    const desc = effectiveModels.find((m) => m.id === current);
    if (desc?.isFree) return;
    const freePool = effectiveModels.filter((m) => m.isFree);
    if (freePool.length > 0) changeModel(freePool[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, effectiveModels.length]);

  // State, not a ref: the tab-fit effect below has to re-run once the restore lands, and a
  // ref mutation does not schedule that.
  const [draftRestoredTab, setDraftRestoredTab] = useState<string | null>(null);

  useEffect(() => {
    if (effectiveModels.length === 0) return;
    // Must not fire before the draft restore: it would read the still-default model and
    // swap away the one the draft was about to restore.
    if (draftRestoredTab === null && !remixId) return;
    const current = form.watch("model") ?? "";
    const desc = effectiveModels.find((m) => m.id === current);
    // Unknown model = a hand-resolved passthrough checkpoint; fits any tab.
    if (!desc || isModelInTab(desc, activeTab)) return;
    const pool = effectiveModels.filter((m) => isModelInTab(m, activeTab));
    if (pool.length > 0) changeModel(pool[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, effectiveModels.length, draftRestoredTab, remixId]);
  useEffect(() => {
    if (draftRestoredTab === activeTab || remixId) return;
    setDraftRestoredTab(activeTab);
    if (!draft) {
      const fallback =
        effectiveModels.find((m) => isModelInTab(m, activeTab)) ??
        getModelDescriptor(INITIAL_MODEL);
      form.reset(defaultsFor(fallback));
      return;
    }
    form.reset({
      ...defaultsFor(getModelDescriptor(draft.model || INITIAL_MODEL)),
      model: draft.model,
      prompt: draft.prompt,
      negativePrompt: draft.negativePrompt ?? "",
      params: draft.params,
      loras: draft.loras,
      references: draft.references,
      ui: draft.extraParams ?? { variants: 1 },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, remixId, draft, form, draftRestoredTab]);

  const setDraftRef = useRef(setDraft);
  useEffect(() => {
    setDraftRef.current = setDraft;
  }, [setDraft]);
  useEffect(() => {
    const subscription = form.watch(() => {
      const timer = setTimeout(() => {
        const v = form.getValues();
        const next: GenerateDraft = {
          model: v.model ?? INITIAL_MODEL,
          prompt: v.prompt ?? "",
          negativePrompt: v.negativePrompt ?? "",
          params: v.params ?? {},
          loras: v.loras,
          references: v.references,
          extraParams: v.ui ?? { variants: 1 },
        };
        setDraftRef.current(next);
      }, 500);
      return () => clearTimeout(timer);
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  useEffect(() => {
    if (!restorePayload) return;
    const desc = findDescriptor(restorePayload.model ?? INITIAL_MODEL);
    const mergedParams: Record<string, unknown> = {
      ...desc.defaultParams,
      ...(restorePayload.params ?? {}),
    };
    if (restorePayload.initImageUrl) {
      mergedParams.initImageUrl = restorePayload.initImageUrl;
    }
    Object.assign(mergedParams, restorePayload.paramOverrides ?? {});
    form.reset({
      ...defaultsFor(desc),
      model: desc.id,
      prompt: restorePayload.prompt,
      negativePrompt: restorePayload.negativePrompt ?? "",
      params: mergedParams as GenerationFormValues["params"],
      loras: restorePayload.loras ?? undefined,
      references: restorePayload.references ?? undefined,
      ui: restorePayload.extraParams ?? { variants: 1 },
    });
    setRestorePayload(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restorePayload]);

  // A preset picks a model deliberately, so the TAB follows the model (the fit effect
  // above resolves the other direction and would swap the preset's model out).
  const adoptModelTab = (modelId: string) => {
    const desc = effectiveModels.find((m) => m.id === modelId);
    if (!desc || isModelInTab(desc, activeTab)) return;
    const target: GenerateTab = desc.tabs?.[0] ?? "text2img";
    nav.setTab(target);
    setDraftRestoredTab(target);
  };

  return {
    form,
    descriptor,
    effectiveModels,
    changeModel,
    adoptModelTab,
    samplerMemory,
    setSamplerMemory,
    setDraft,
  };
}
