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
export type SnapshotRestorePayload = {
  model: string;
  prompt: string;
  negativePrompt: string | null;
  params: Record<string, unknown> | null;
  loras: unknown;
  references: unknown;
  extraParams: Record<string, unknown> | null;
  nsfw: boolean;
};

export const restoreSnapshotIntoFormAtom = atom<SnapshotRestorePayload | null>(
  null,
);

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
