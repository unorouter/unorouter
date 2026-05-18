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
  nsfw: boolean;
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
  nsfw: boolean;
  extraParams: Record<string, unknown>;
};

export type GenerateTab = "text2img" | "img2img" | "edit";

export const INITIAL_GENERATE_DRAFT: GenerateDraft = {
  model: "pony",
  prompt: "",
  negativePrompt: "",
  params: {},
  loras: undefined,
  references: undefined,
  nsfw: true,
  extraParams: { variants: 1 },
};

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

// TODO: legacy alias; remove once all callers switch to per-tab atoms above.
export const generateDraftAtom = text2imgDraftAtom;

export type ModelParamsMemory = Record<string, Record<string, unknown>>;

export const samplerMemoryAtom = atomWithStorage<ModelParamsMemory>(
  "generate-sampler-memory-v1",
  {},
);

// URL-synced via playground-page.tsx (?tab=... &mode=...); persistence is the URL.
export const activeTabAtom = atom<GenerateTab>("text2img");
export const activeSubPillAtom = atom<Img2ImgSubPill>("img2img");

// Data URL (PNG with white = mask, transparent = keep); submit handler
// uploads decoded blob to R2 and sets params.maskUrl.
export const inpaintMaskAtom = atom<string | null>(null);
