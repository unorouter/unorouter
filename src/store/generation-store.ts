import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

// Active generation id for the unified /generate page. The form sets it on
// submit; the result column reads it. Stays in sync with the URL via the
// page-level effect that seeds it from the route id at mount.
//
// Not persisted: refreshes drop back to the URL-derived id, which is what
// we want for share/refresh/back-button behavior.
export const activeGenerationIdAtom = atom<string | null>(null);

// Form draft persisted across page navigations. The chat surface taught us
// this is non-negotiable: typing a prompt, switching to dashboard to check
// something, then coming back should not lose work. Stored in localStorage
// (not cookies — refs/loras can blow past the 4 KB limit). Cleared on a
// successful submit so the user doesn't see stale state on next visit.
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

export const generateDraftAtom = atomWithStorage<GenerateDraft | null>(
  "generate-draft-v1",
  null,
);

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
