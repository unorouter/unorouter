import type {
  GenerateTab,
  Img2ImgSubPill,
} from "@/components/pages/sidebar/image/image-nav";
import type {
  ImageFormUi,
  ImageParams,
  LoraEntry,
  ReferenceEntry,
} from "@/lib/validation/image";
import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

type SnapshotRestorePayload = {
  model: string;
  prompt: string;
  negativePrompt: string | null;
  params: ImageParams | null;
  loras: LoraEntry[] | null;
  references: ReferenceEntry[] | null;
  extraParams: ImageFormUi | null;
  tab?: GenerateTab;
  subPill?: Img2ImgSubPill;
  initImageUrl?: string;
  /** Merged over the snapshot's own params, so a quick action can set the knobs it implies. */
  paramOverrides?: Partial<ImageParams>;
};

// One-shot mailbox: the form consumes this and clears it, so a remount cannot re-apply a
// stale restore.
export const restoreSnapshotIntoFormAtom = atom<SnapshotRestorePayload | null>(
  null,
);

// Persisted because submitting remounts the form: losing this leaves the Overwrite
// button gone while the preset's values are still in effect.
export const selectedPresetIdAtom = localAtom<string>(
  "image-selected-preset-v1",
  "",
);

export type GenerateDraft = {
  model: string;
  prompt: string;
  negativePrompt: string;
  params: ImageParams;
  loras?: LoraEntry[];
  references?: ReferenceEntry[];
  extraParams: ImageFormUi;
};

// getOnInit is safe here only because the page is client-only and these are
// localStorage, not the cookie-backed atoms whose deferred load avoids the SSR
// mismatch. Without it the first render misses the draft and the form resets.
function localAtom<T>(key: string, initial: T) {
  return atomWithStorage<T>(key, initial, undefined, { getOnInit: true });
}

export const text2imgDraftAtom = localAtom<GenerateDraft | null>(
  "image-draft-text2img-v1",
  null,
);
export const img2imgDraftAtom = localAtom<GenerateDraft | null>(
  "image-draft-img2img-v1",
  null,
);
export const editDraftAtom = localAtom<GenerateDraft | null>(
  "image-draft-edit-v1",
  null,
);

type ModelParamsMemory = Record<string, Partial<ImageParams>>;

export const samplerMemoryAtom = localAtom<ModelParamsMemory>(
  "image-sampler-memory-v1",
  {},
);
