import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

// sessionId comes from /playground/<sessionId>; snapshotId from ?snap=<id>
// (defaults to the session's newest). Chevron nav only flips snapshotId.
// Not persisted: refreshes drop back to URL-derived values.
export const activeSessionIdAtom = atom<string | null>(null);
export const activeSnapshotIdAtom = atom<string | null>(null);

// Write-only fire-and-forget: chevron nav writes a snapshot's frozen
// params here, the form subscribes and overwrites its fields. Cleared
// after a tick so a second click on the same snapshot triggers another
// restore. The hover toolbar (Inpaint / Upscale / ADetailer / Edit) also
// writes `tab` and `subPill` to route to the right mode while pre-filling
// the form with the source image as init.
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
  /** When present, the page switches to this tab + sub-pill before
   *  applying the rest of the payload. Absent for the chevron path. */
  tab?: GenerateTab;
  subPill?: Img2ImgSubPill;
  /** Hover-toolbar route: form merges this into `params.initImageUrl`. */
  initImageUrl?: string;
};

export const restoreSnapshotIntoFormAtom = atom<SnapshotRestorePayload | null>(
  null,
);

// Form draft persisted across page navigations. Stored in localStorage,
// not cookies; refs/loras can blow past the 4 KB limit. Cleared on a
// successful submit so the user doesn't see stale state on next visit.
// Per-tab atoms: Text2Img, Img2Img, and Edit each maintain their own
// draft. `generateDraftAtom` is a legacy alias to the Text2Img slot.
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

// Each tab gets its own storage key so layouts and model picks don't
// bleed across modes.
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

// Per-model setting memory: switching back to a previously-used model
// restores its last params. Falls back to defaultParams for unseen models.
export type ModelParamsMemory = Record<string, Record<string, unknown>>;

export const samplerMemoryAtom = atomWithStorage<ModelParamsMemory>(
  "generate-sampler-memory-v1",
  {},
);

// Both URL-synced via playground-page.tsx (?tab=... &mode=...) so deep
// links and back/forward work. Persistence comes from the URL.
export const activeTabAtom = atom<GenerateTab>("text2img");

// Ignored when activeTab !== "img2img". Defaults to "img2img" so the
// section header is meaningful before the user picks a sub-mode.
export const activeSubPillAtom = atom<Img2ImgSubPill>("img2img");

// Data URL (PNG with white = mask, transparent = keep). Canvas writes
// this; submit handler uploads the decoded blob to R2 and sets
// params.maskUrl. Cleared on tab switch + after a successful submit.
export const inpaintMaskAtom = atom<string | null>(null);
