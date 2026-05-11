import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

// Active session + snapshot ids for the unified /generate page.
//   - sessionId comes from /generate/<sessionId>
//   - snapshotId comes from ?snap=<id> (defaults to the session's newest)
// The form's submit sets both; the result column reads them. Chevron nav
// only flips snapshotId; sessionId is stable for the lifetime of a session.
// Not persisted: refreshes drop back to URL-derived values.
export const activeSessionIdAtom = atom<string | null>(null);
export const activeSnapshotIdAtom = atom<string | null>(null);

// Write-only fire-and-forget atom: the chevron nav writes a snapshot's
// frozen params here, the form subscribes and overwrites its fields. The
// payload is cleared after a tick so a second click on the same snapshot
// triggers another restore.
//
// The hover toolbar on result tiles (Inpaint / Upscale / ADetailer / Edit
// shortcuts) writes `tab` and `subPill` to route the user to the right
// tab + sub-pill while pre-filling the form with the source image as init.
export type Img2ImgSubPill =
  | "img2img"
  | "upscale"
  | "adetailer"
  | "inpaint";

export type SnapshotRestorePayload = {
  model: string;
  prompt: string;
  negativePrompt: string | null;
  params: Record<string, unknown> | null;
  loras: unknown;
  references: unknown;
  extraParams: Record<string, unknown> | null;
  nsfw: boolean;
  // Optional route hint: when present, the page should switch to this
  // tab + sub-pill before applying the rest of the payload. Absent for
  // the legacy chevron-snapshot path.
  tab?: GenerateTab;
  subPill?: Img2ImgSubPill;
  // When the hover toolbar routes to Img2Img/Inpaint/etc., the source
  // image needs to land on `params.initImageUrl`. The payload sets this
  // directly; the form merges it into `params`.
  initImageUrl?: string;
};

export const restoreSnapshotIntoFormAtom = atom<SnapshotRestorePayload | null>(
  null,
);

// Form draft persisted across page navigations. The chat surface taught us
// this is non-negotiable: typing a prompt, switching to dashboard to check
// something, then coming back should not lose work. Stored in localStorage
// (not cookies — refs/loras can blow past the 4 KB limit). Cleared on a
// successful submit so the user doesn't see stale state on next visit.
//
// Per-tab atoms: Text2Img, Img2Img, and Edit each maintain their own
// model + prompt + params. Switching tabs preserves each tab's last draft
// separately. The legacy single-atom `generateDraftAtom` is kept as an
// alias to the Text2Img slot for any callers that haven't migrated yet.
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

// Per-tab draft slots. Each tab gets its own storage key so layouts and
// model picks don't bleed across modes. The legacy `generateDraftAtom` is
// re-exported below as an alias to the Text2Img slot for back-compat.
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

// Legacy alias. The current form imports this; remove once all callers
// switch to the per-tab atoms above.
export const generateDraftAtom = text2imgDraftAtom;

// Per-model setting memory: when the user switches to a model they used
// before, restore the params they last left it at. Falls back to the
// descriptor's defaultParams for unseen models. Mirrors the chat sampler-
// memory idea but generates have model-specific knobs (samplers,
// schedulers, hires-fix) that are per-model, not global.
export type ModelParamsMemory = Record<string, Record<string, unknown>>;

export const samplerMemoryAtom = atomWithStorage<ModelParamsMemory>(
  "generate-sampler-memory-v1",
  {},
);

// ---------------------------------------------------------------------------
// Studio tab + sub-pill state. Both are URL-synced via generate-page.tsx
// (?tab=... &mode=...) so deep links and back/forward work. Plain in-memory
// atoms; persistence comes from the URL.
// ---------------------------------------------------------------------------
export const activeTabAtom = atom<GenerateTab>("text2img");

// Active sub-pill inside the Img2Img tab. Ignored when activeTab !==
// "img2img". Defaults to "img2img" so the section header is meaningful
// even before the user picks a sub-mode.
export const activeSubPillAtom = atom<Img2ImgSubPill>("img2img");

// Inpaint mask data: stored as a data URL (PNG with white = mask,
// transparent = keep). The canvas component writes this; the submit
// handler uploads the decoded blob to R2 and sets params.maskUrl.
// Cleared on tab switch + after a successful submit.
export const inpaintMaskAtom = atom<string | null>(null);
