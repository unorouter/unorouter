import { DEFAULT_ROLE_FLAGS, type ProviderAdapter } from "./types";

// Gemini answers 400 "Requests ending with a model turn are not supported" when the
// last turn is the model's, so it needs the closing user stub even though it never
// accepts a prefill in that slot.
export const geminiThinkingAdapter: ProviderAdapter = {
  name: "gemini-thinking",
  match: (m) => /gemini-2[.-]?\d*-flash-thinking/i.test(m),
  roleFlags: {
    ...DEFAULT_ROLE_FLAGS,
    fullSystem: false,
    firstSystem: true,
    alternateRoles: true,
    userStub: true,
    endUserStub: true,
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
    endUserStub: true,
  },
};
