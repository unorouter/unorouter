"use client";

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

export function requestImagePromptReview(
  prompt: string,
): Promise<string | null> {
  skipPending();
  return new Promise<string | null>((resolve) => {
    chatStore.set(imagePromptRequestAtom, { mode: "review", prompt, resolve });
  });
}

export function openImagePromptDialog(mediaId: string) {
  skipPending();
  chatStore.set(imagePromptRequestAtom, { mode: "media", mediaId });
}
