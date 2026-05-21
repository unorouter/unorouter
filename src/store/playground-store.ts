import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export const activeSessionIdAtom = atom<string | null>(null);
export const activeSnapshotIdAtom = atom<string | null>(null);

export type Img2ImgSubPill = "img2img" | "upscale" | "adetailer" | "inpaint";

export type SnapshotRestorePayload = {
  model: string;
  prompt: string;
  negativePrompt: string | null;
  params: Record<string, unknown> | null;
  loras: unknown;
  references: unknown;
  extraParams: Record<string, unknown> | null;
  tab?: GenerateTab;
  subPill?: Img2ImgSubPill;
  initImageUrl?: string;
};

export const restoreSnapshotIntoFormAtom = atom<SnapshotRestorePayload | null>(
  null,
);

// localStorage (not cookies): refs/loras can exceed the 4 KB cookie limit.
export type GenerateDraft = {
  model: string;
  prompt: string;
  negativePrompt: string;
  params: Record<string, unknown>;
  loras: unknown;
  references: unknown;
  extraParams: Record<string, unknown>;
};

export type GenerateTab = "text2img" | "img2img" | "edit";

export const text2imgDraftAtom = atomWithStorage<GenerateDraft | null>(
  "generate-draft-text2img-v1",
  null,
);

export const img2imgDraftAtom = atomWithStorage<GenerateDraft | null>(
  "generate-draft-img2img-v1",
  null,
);

export const editDraftAtom = atomWithStorage<GenerateDraft | null>(
  "generate-draft-edit-v1",
  null,
);

export type ModelParamsMemory = Record<string, Record<string, unknown>>;

export const samplerMemoryAtom = atomWithStorage<ModelParamsMemory>(
  "generate-sampler-memory-v1",
  {},
);

// URL-synced via playground-page.tsx (?tab=... &mode=...); persistence is the URL.
export const activeTabAtom = atom<GenerateTab>("text2img");
export const activeSubPillAtom = atom<Img2ImgSubPill>("img2img");
