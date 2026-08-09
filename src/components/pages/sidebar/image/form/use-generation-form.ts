"use client";

import { useAuthQuery } from "@/hooks/auth/auth-hook";
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
import { samplerMemoryAtom } from "@/store/image-store";
import { typeboxResolver } from "@hookform/resolvers/typebox";
import { useAtom } from "jotai";
import { useForm } from "react-hook-form";
import { useImageNav, type GenerateTab } from "../image-nav";
import { INITIAL_MODEL } from "../image-constants";
import { isModelInTab } from "./mode";
import { defaultsFor } from "./persistence";
import { useDraftPersistence } from "./use-draft-persistence";
import { useModelTabFit } from "./use-model-tab-fit";
import { useRemixSeed } from "./use-remix-seed";
import { useSnapshotRestore } from "./use-snapshot-restore";

export function useGenerationForm() {
  const nav = useImageNav();
  const authQuery = useAuthQuery();
  const isLoggedIn = !!authQuery.data;

  const [samplerMemory, setSamplerMemory] = useAtom(samplerMemoryAtom);

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

  const remix = useRemixSeed({ form, findDescriptor });
  const drafts = useDraftPersistence({
    form,
    tab: nav.tab,
    remixId: remix.remixId,
    effectiveModels,
  });
  useModelTabFit({
    form,
    tab: nav.tab,
    effectiveModels,
    changeModel,
    isLoggedIn,
    remixId: remix.remixId,
    draftRestoredTab: drafts.draftRestoredTab,
  });
  useSnapshotRestore({ form, findDescriptor });

  // A preset picks a model deliberately, so the TAB follows the model (the fit hook
  // resolves the other direction and would swap the preset's model out).
  const adoptModelTab = (modelId: string) => {
    const desc = effectiveModels.find((m) => m.id === modelId);
    if (!desc || isModelInTab(desc, nav.tab)) return;
    const target: GenerateTab = desc.tabs?.[0] ?? "text2img";
    nav.setTab(target);
    drafts.setDraftRestoredTab(target);
  };

  return {
    form,
    descriptor,
    effectiveModels,
    changeModel,
    adoptModelTab,
    samplerMemory,
    setSamplerMemory,
    setDraft: drafts.setDraft,
  };
}
