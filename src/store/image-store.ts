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

// The prompt the last restore wrote. Navigating history auto-restores the form, which would
// silently destroy work the user had typed; comparing against this tells the two apart.
export const lastRestoredPromptAtom = atom<string | null>(null);

// Which preset is equipped. Not component state: submitting navigates from /image to
// /image/[id], which remounts the form, and a locally-held selection reset itself to blank
// on every generation even though the values it applied were still in effect.
export const selectedPresetIdAtom = atom<string>("");

export type GenerateDraft = {
  model: string;
  prompt: string;
  negativePrompt: string;
  params: GenerationParams;
  loras?: LoraEntry[];
  references?: ReferenceEntry[];
  extraParams: GenerationFormUi;
};

// Each tab keeps its own draft so switching between them does not lose work.
//
// getOnInit reads localStorage synchronously during atom creation. Without it the first
// render sees null, the form restores its defaults, and the real draft arrives too late to
// be applied - so the model and every setting reset on each visit. Safe here because the
// page is client-only and these are localStorage, not the cookie-backed atoms whose async
// load exists to avoid an SSR hydration mismatch.
const draftStorageOptions = { getOnInit: true } as const;

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

// Remembers the params last used per model, so picking a model back up restores its settings.
export const samplerMemoryAtom = atomWithStorage<ModelParamsMemory>(
  "image-sampler-memory-v1",
  {},
  undefined,
  draftStorageOptions,
);

export const activeTabAtom = atom<GenerateTab>("text2img");
export const activeSubPillAtom = atom<Img2ImgSubPill>("img2img");
