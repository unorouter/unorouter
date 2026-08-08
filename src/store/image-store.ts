import type {
  GenerationFormUi,
  GenerationParams,
  LoraEntry,
  ReferenceEntry,
} from "@/lib/validation/playground";
import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export const activeSessionIdAtom = atom<string | null>(null);
export const activeSnapshotIdAtom = atom<string | null>(null);

export type Img2ImgSubPill = "img2img" | "upscale" | "adetailer" | "inpaint";

export type GenerateTab = "text2img" | "img2img" | "edit";

type SnapshotRestorePayload = {
  model: string;
  prompt: string;
  negativePrompt: string | null;
  params: GenerationParams | null;
  loras: LoraEntry[] | null;
  references: ReferenceEntry[] | null;
  extraParams: GenerationFormUi | null;
  tab?: GenerateTab;
  subPill?: Img2ImgSubPill;
  initImageUrl?: string;
  /** Merged over the snapshot's own params, so a quick action can set the knobs it implies. */
  paramOverrides?: Partial<GenerationParams>;
};

// One-shot mailbox: the form consumes this and clears it, so a remount cannot re-apply a
// stale restore.
export const restoreSnapshotIntoFormAtom = atom<SnapshotRestorePayload | null>(
  null,
);

// Persisted: submitting remounts the form, and the equipped preset must survive that (and
// a reload) or the Overwrite button disappears while the preset's values are still in effect.
export const selectedPresetIdAtom = atomWithStorage<string>(
  "image-selected-preset-v1",
  "",
  undefined,
  { getOnInit: true },
);

export type GenerateDraft = {
  model: string;
  prompt: string;
  negativePrompt: string;
  params: GenerationParams;
  loras?: LoraEntry[];
  references?: ReferenceEntry[];
  extraParams: GenerationFormUi;
};

// getOnInit: the first render must see the draft or the form restores defaults. Safe here
// because the page is client-only and these are localStorage, not the cookie-backed atoms
// whose async load avoids SSR hydration mismatches.
const draftStorageOptions = { getOnInit: true } as const;

// One draft per tab so switching between them does not lose work.
export const text2imgDraftAtom = atomWithStorage<GenerateDraft | null>(
  "image-draft-text2img-v1",
  null,
  undefined,
  draftStorageOptions,
);

export const img2imgDraftAtom = atomWithStorage<GenerateDraft | null>(
  "image-draft-img2img-v1",
  null,
  undefined,
  draftStorageOptions,
);

export const editDraftAtom = atomWithStorage<GenerateDraft | null>(
  "image-draft-edit-v1",
  null,
  undefined,
  draftStorageOptions,
);

type ModelParamsMemory = Record<string, Partial<GenerationParams>>;

// Params last used per model, restored when the model is picked again.
export const samplerMemoryAtom = atomWithStorage<ModelParamsMemory>(
  "image-sampler-memory-v1",
  {},
  undefined,
  draftStorageOptions,
);

export const activeTabAtom = atom<GenerateTab>("text2img");
export const activeSubPillAtom = atom<Img2ImgSubPill>("img2img");
