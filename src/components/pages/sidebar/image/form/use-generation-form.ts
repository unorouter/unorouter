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
  type GenerateTab,
} from "@/store/image-store";
import { typeboxResolver } from "@hookform/resolvers/typebox";
import { useAtom, useAtomValue } from "jotai";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { useSearchParams } from "next/navigation";
import { activeTabAtom, activeSubPillAtom } from "@/store/image-store";
import { INITIAL_MODEL } from "../image-constants";

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
    ui: { variants: 1 },
  };
}

function draftAtomFor(tab: GenerateTab) {
  if (tab === "img2img") return img2imgDraftAtom;
  if (tab === "edit") return editDraftAtom;
  return text2imgDraftAtom;
}

export function useGenerationForm() {
  const activeTab = useAtomValue(activeTabAtom);
  const activeSubPill = useAtomValue(activeSubPillAtom);
  const searchParams = useSearchParams();
  const authQuery = useAuthQuery();
  const isLoggedIn = !!authQuery.data;

  const [samplerMemory, setSamplerMemory] = useAtom(samplerMemoryAtom);
  const [draft, setDraft] = useAtom(draftAtomFor(activeTab));
  const [restorePayload, setRestorePayload] = useAtom(
    restoreSnapshotIntoFormAtom,
  );

  const remixId = searchParams.get("remix");
  const hiresShortcut = searchParams.get("hires") === "1";
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

  useEffect(() => {
    const mode =
      activeTab === "text2img"
        ? "txt2img"
        : activeTab === "edit"
          ? "edit"
          : activeSubPill;
    form.setValue("mode", mode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, activeSubPill]);

  const seededIdRef = useRef<string | null>(null);
  useEffect(() => {
    const data = seedQuery.data;
    if (!data || seededIdRef.current === data.id) return;
    seededIdRef.current = data.id;
    const desc = findDescriptor(data.model);
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
        ...(data.params ?? {}),
        ...hiresParams,
      },
      loras: data.loras ?? undefined,
      references: data.references ?? undefined,
      visibility: "private",
      ui: { variants: 1 },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedQuery.data, form]);

  useEffect(() => {
    if (effectiveModels.length === 0) return;
    const current = form.watch("model") ?? "";
    const desc = effectiveModels.find((m) => m.id === current);
    if (desc && (isLoggedIn || desc.isFree)) return;
    const freePool = effectiveModels.filter((m) => m.isFree);
    if (freePool.length > 0) changeModel(freePool[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, effectiveModels.length]);

  useEffect(() => {
    if (effectiveModels.length === 0) return;
    const current = form.watch("model") ?? "";
    const desc = effectiveModels.find((m) => m.id === current);
    if (desc && isModelInTab(desc, activeTab)) return;
    const pool = effectiveModels.filter((m) => isModelInTab(m, activeTab));
    if (pool.length > 0) changeModel(pool[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, effectiveModels.length]);

  const draftRestoredRef = useRef<string | null>(null);
  useEffect(() => {
    if (draftRestoredRef.current === activeTab || remixId) return;
    draftRestoredRef.current = activeTab;
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
  }, [activeTab, remixId, draft, form]);

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

  return {
    form,
    descriptor,
    effectiveModels,
    changeModel,
    samplerMemory,
    setSamplerMemory,
    setDraft,
  };
}
