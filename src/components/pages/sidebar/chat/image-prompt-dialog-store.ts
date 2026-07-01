"use client";

// Imperative entry points for the illustrator prompt dialog (same pending-request-atom pattern as
// confirm()): review mode gates generation on user confirm/edit; media mode inspects + regenerates a
// landed inlay image. One pending request at a time; a new one skips the pending review.

import { chatStore } from "@/store/chat-store";
import { atom } from "jotai";

export type ImagePromptRequest =
  | {
      mode: "review";
      prompt: string;
      resolve: (edited: string | null) => void;
    }
  | { mode: "media"; mediaId: string };

export const imagePromptRequestAtom = atom<ImagePromptRequest | null>(null);

function skipPending() {
  const prior = chatStore.get(imagePromptRequestAtom);
  if (prior?.mode === "review") prior.resolve(null);
}

// Opt-in preview: resolves with the (possibly edited) prompt to generate, or null to skip.
export function requestImagePromptReview(
  prompt: string,
): Promise<string | null> {
  skipPending();
  return new Promise<string | null>((resolve) => {
    chatStore.set(imagePromptRequestAtom, { mode: "review", prompt, resolve });
  });
}

// Post-hoc verify/regenerate for a landed inlay image.
export function openImagePromptDialog(mediaId: string) {
  skipPending();
  chatStore.set(imagePromptRequestAtom, { mode: "media", mediaId });
}
