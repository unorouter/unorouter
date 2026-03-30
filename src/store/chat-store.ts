import { atom } from "jotai";

export const selectedConversationAtom = atom<string | null>(null);
export const newChatModelAtom = atom("gpt-5.4-mini");
