import { DEFAULT_ROLE_FLAGS, type ProviderAdapter } from "./types";

// Thinking-exp rejects CIVIC_INTEGRITY. Before the generic gemini adapter.
export const geminiThinkingAdapter: ProviderAdapter = {
  name: "gemini-thinking",
  match: (m) => /gemini-2[.-]?\d*-flash-thinking/i.test(m),
  roleFlags: {
    ...DEFAULT_ROLE_FLAGS,
    fullSystem: false,
    firstSystem: true,
    alternateRoles: true,
    userStub: true,
    noCivilIntegrity: true,
  },
};

export const geminiAdapter: ProviderAdapter = {
  name: "gemini",
  match: (m) => /gemini/i.test(m),
  roleFlags: {
    ...DEFAULT_ROLE_FLAGS,
    fullSystem: false,
    firstSystem: true,
    alternateRoles: true,
    userStub: true,
  },
};
