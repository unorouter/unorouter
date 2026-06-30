import { DEFAULT_ROLE_FLAGS, type ProviderAdapter } from "./types";

// Strict roles + prefix-completion + thinking API. Before GLM (first match wins).
export const deepseekAdapter: ProviderAdapter = {
  name: "deepseek",
  match: (m) => /deepseek/i.test(m),
  roleFlags: {
    ...DEFAULT_ROLE_FLAGS,
    fullSystem: false,
    firstSystem: true,
    alternateRoles: true,
    userStub: true,
    endUserStub: true,
    prefillSupported: true,
    deepSeekPrefix: true,
    deepSeekThinkingToggle: true,
    deepSeekThinkingInput: true,
  },
};
