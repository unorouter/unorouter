"use client";

import { useAuthQuery } from "@/hooks/auth/auth-hook";
import { useImageModelsQuery } from "@/hooks/models/pricing-hook";
import {
  getModelDescriptor,
  STATIC_IMAGE_MODELS,
  type ImageModelDescriptor,
} from "@/lib/ai/image/models";
import { applyParamSpec, lookupParamSpec } from "@/lib/ai/image/spec-apply";
import {
  imageFormValues,
  type ImageFormValues,
  type ImageModelId,
} from "@/lib/validation/image";
import { samplerMemoryAtom } from "@/store/image-store";
import { typeboxResolver } from "@hookform/resolvers/typebox";
import { useAtom } from "jotai";
import { useForm } from "react-hook-form";
import { useImageNav, type GenerateTab } from "../../image-nav";
import { INITIAL_MODEL } from "../../image-constants";
import { isModelInTab } from "../logic/mode";
import { defaultsFor } from "../logic/persistence";
import { useDraftPersistence } from "./use-draft-persistence";
import { useModelTabFit } from "./use-model-tab-fit";
import { useRemixSeed } from "./use-remix-seed";
import { useSnapshotRestore } from "./use-snapshot-restore";

export function useImageForm() {
  const nav = useImageNav();
  const authQuery = useAuthQuery();
  const isLoggedIn = !!authQuery.data;

  const [samplerMemory, setSamplerMemory] = useAtom(samplerMemoryAtom);

  const imageModelsQuery = useImageModelsQuery();
  const effectiveModels = imageModelsQuery.data?.models?.length
    ? imageModelsQuery.data.models
    : STATIC_IMAGE_MODELS;
  const findDescriptor = (id: ImageModelId): ImageModelDescriptor =>
    effectiveModels.find((m) => m.id === id) ?? getModelDescriptor(id);

  const form = useForm<ImageFormValues>({
    resolver: typeboxResolver(imageFormValues),
    defaultValues: defaultsFor(getModelDescriptor(INITIAL_MODEL)),
  });

  const selectedModel = form.watch("model") ?? INITIAL_MODEL;
  const baseDescriptor = findDescriptor(selectedModel);
  // The passthrough row carries no lineage of its own, so its controls would come from a
  // generic guess. The checkpoint the user resolved DOES know its architecture, and
  // Runware documents one schema per architecture, so the picked checkpoint decides which
  // knobs a passthrough generation actually accepts.
  // Hosted API models (FLUX.2, gpt-image, seedream) are picked by AIR and carry no
  // architecture, so gating the lookup on one skipped them entirely and left them on the
  // passthrough's blank descriptor: no reference uploader on a model that takes ten.
  const pickedArchitecture = form.watch("ui.airArchitecture");
  const pickedAir = form.watch("ui.air");
  const checkpointSpec =
    pickedAir || pickedArchitecture
      ? lookupParamSpec(pickedAir, pickedArchitecture)
      : null;
  const descriptor = checkpointSpec
    ? applyParamSpec(baseDescriptor, checkpointSpec)
    : baseDescriptor;

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
